import json
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from .. import models
from ..schemas import AnnotationSubmit
from ..database import get_db
from ..auth import get_current_user
from ..models import User

router = APIRouter(prefix="/annotations", tags=["annotations"])


@router.post("/submit")
async def submit_annotations(
    submission: AnnotationSubmit,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 权限检查：仅 worker 可提交标注
    if current_user.role != "worker":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="仅标注工人可以提交标注")

    # 查询任务
    task = db.query(models.Task).filter(models.Task.id == submission.task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="任务不存在")

    # 检查任务状态
    if task.status != "annotating":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="该任务当前不接受标注")

    # 检查是否已标注过此任务
    existing_annotation = db.query(models.Annotation).filter(
        models.Annotation.task_id == submission.task_id,
        models.Annotation.worker_id == current_user.id
    ).first()
    if existing_annotation:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="您已标注过此任务")

    # 获取该任务的图片ID列表
    valid_image_ids = [
        img.id for img in db.query(models.TaskImage.id).filter(
            models.TaskImage.task_id == submission.task_id
        ).all()
    ]

    # 验证并保存标注
    for item in submission.image_annotations:
        # 验证 image_id 是否属于此任务
        if item.image_id not in valid_image_ids:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"图片ID {item.image_id} 不属于此任务")

        # 创建标注记录
        annotation = models.Annotation(
            task_id=submission.task_id,
            image_id=item.image_id,
            worker_id=current_user.id,
            annotations=json.dumps([a.dict() for a in item.annotations])
        )
        db.add(annotation)

    # 更新任务状态
    task.current_count += 1
    if task.current_count >= task.target_count:
        task.status = "completed"

    db.commit()

    return {
        "message": "标注提交成功",
        "current_count": task.current_count,
        "target_count": task.target_count
    }


@router.get("/my")
async def get_my_annotations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 权限检查：仅 worker 可查看标注历史
    if current_user.role != "worker":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="仅标注工人可查看标注历史")

    # 查询当前用户的标注记录，按任务分组
    annotations = db.query(
        models.Annotation.id.label("annotation_id"),
        models.Annotation.task_id,
        models.Task.title.label("task_title"),
        models.Task.status.label("task_status"),
        func.count(models.Annotation.id).label("image_count"),
        func.max(models.Annotation.created_at).label("created_at")
    ).join(
        models.Task, models.Annotation.task_id == models.Task.id
    ).filter(
        models.Annotation.worker_id == current_user.id
    ).group_by(
        models.Annotation.task_id,
        models.Task.title,
        models.Task.status
    ).order_by(
        func.max(models.Annotation.created_at).desc()
    ).all()

    return [
        {
            "annotation_id": ann.annotation_id,
            "task_id": ann.task_id,
            "task_title": ann.task_title,
            "task_status": ann.task_status,
            "image_count": ann.image_count,
            "created_at": ann.created_at
        }
        for ann in annotations
    ]
