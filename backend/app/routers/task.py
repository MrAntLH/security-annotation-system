import os
import uuid
import json
import shutil
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import func

from .. import models
from ..schemas import TaskResponse, TaskListItem, TaskStats, WorkerStats, AnnotationRecord
from ..database import get_db
from ..auth import get_current_user
from ..config import settings
from ..models import User
from ..services.task_processor import start_pre_annotation

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.post("/create", response_model=TaskResponse)
async def create_task(
    title: str = Form(...),
    description: str = Form(""),
    label_classes: str = Form(...),
    target_count: int = Form(...),
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 权限检查：仅 requester 可创建任务
    if current_user.role != "requester":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="仅标注请求方可以创建任务")

    # 验证 label_classes 是合法 JSON
    try:
        json.loads(label_classes)
    except json.JSONDecodeError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="label_classes 必须是合法的 JSON 数组字符串")

    # 验证文件
    if not files:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="请至少选择一个图片文件")

    # 验证文件类型
    valid_extensions = [".jpg", ".jpeg", ".png", ".bmp"]
    for file in files:
        filename = file.filename.lower()
        if not any(filename.endswith(ext) for ext in valid_extensions):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"不支持的文件类型: {file.filename}")

    # 创建任务记录
    task = models.Task(
        title=title,
        description=description,
        label_classes=label_classes,
        target_count=target_count,
        current_count=0,
        status="pending",  # 初始状态为 pending，等待预标注
        created_by=current_user.id
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    # 创建任务上传目录
    task_dir = os.path.join(settings.UPLOAD_DIR, str(task.id))
    os.makedirs(task_dir, exist_ok=True)

    # 保存文件并创建 TaskImage 记录
    for file in files:
        # 生成安全文件名
        safe_filename = f"{uuid.uuid4().hex}_{file.filename}"
        file_path = os.path.join(task_dir, safe_filename)

        # 保存文件
        try:
            with open(file_path, "wb") as buffer:
                buffer.write(await file.read())
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"文件保存失败: {str(e)}")

        # 创建 TaskImage 记录
        task_image = models.TaskImage(
            task_id=task.id,
            filename=file.filename,
            filepath=f"uploads/{task.id}/{safe_filename}",
            pre_annotations="[]"
        )
        db.add(task_image)

    db.commit()
    db.refresh(task)

    # 启动后台预标注
    start_pre_annotation(task.id)

    return task


@router.get("/", response_model=List[TaskListItem])
async def get_task_list(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == "requester":
        # 标注请求方：查询自己创建的所有任务
        tasks = db.query(
            models.Task.id,
            models.Task.title,
            models.Task.description,
            models.Task.status,
            models.Task.target_count,
            models.Task.current_count,
            func.count(models.TaskImage.id).label("image_count"),
            models.Task.created_by,
            User.username.label("creator_name"),
            models.Task.created_at
        ).join(
            User, models.Task.created_by == User.id
        ).outerjoin(
            models.TaskImage, models.Task.id == models.TaskImage.task_id
        ).filter(
            models.Task.created_by == current_user.id
        ).group_by(
            models.Task.id, User.username
        ).order_by(models.Task.created_at.desc()).all()
    else:  # worker
        # 标注工人：查询可标注任务
        tasks = db.query(
            models.Task.id,
            models.Task.title,
            models.Task.description,
            models.Task.status,
            models.Task.target_count,
            models.Task.current_count,
            func.count(models.TaskImage.id).label("image_count"),
            models.Task.created_by,
            User.username.label("creator_name"),
            models.Task.created_at
        ).join(
            User, models.Task.created_by == User.id
        ).outerjoin(
            models.TaskImage, models.Task.id == models.TaskImage.task_id
        ).filter(
            models.Task.status == "annotating"
        ).group_by(
            models.Task.id, User.username
        ).order_by(models.Task.created_at.desc()).all()

    return [
        TaskListItem(
            id=task.id,
            title=task.title,
            description=task.description,
            status=task.status,
            target_count=task.target_count,
            current_count=task.current_count,
            image_count=task.image_count,
            created_by=task.created_by,
            creator_name=task.creator_name,
            created_at=task.created_at
        ) for task in tasks
    ]


@router.get("/stats")
async def get_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == "requester":
        # 标注请求方统计
        total_tasks = db.query(func.count(models.Task.id)).filter(models.Task.created_by == current_user.id).scalar() or 0
        pending_tasks = db.query(func.count(models.Task.id)).filter(
            models.Task.created_by == current_user.id,
            models.Task.status == "pending"
        ).scalar() or 0
        annotating_tasks = db.query(func.count(models.Task.id)).filter(
            models.Task.created_by == current_user.id,
            models.Task.status == "annotating"
        ).scalar() or 0
        completed_tasks = db.query(func.count(models.Task.id)).filter(
            models.Task.created_by == current_user.id,
            models.Task.status == "completed"
        ).scalar() or 0

        return TaskStats(
            total_tasks=total_tasks,
            pending_tasks=pending_tasks,
            annotating_tasks=annotating_tasks,
            completed_tasks=completed_tasks
        )
    else:  # worker
        # 标注工人统计
        my_annotations = db.query(func.count(func.distinct(models.Annotation.task_id))).filter(
            models.Annotation.worker_id == current_user.id
        ).scalar() or 0

        available_tasks_subquery = db.query(models.Task.id).filter(models.Task.status == "annotating").subquery()

        annotated_task_ids = db.query(models.Annotation.task_id).filter(
            models.Annotation.worker_id == current_user.id
        ).subquery()

        available_tasks = db.query(func.count(available_tasks_subquery.c.id)).filter(
            available_tasks_subquery.c.id.notin_(
                db.query(annotated_task_ids.c.task_id)
            )
        ).scalar() or 0

        return WorkerStats(
            my_annotations=my_annotations,
            available_tasks=available_tasks,
            my_weight=current_user.weight
        )


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task_detail(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 查询任务
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="任务不存在")

    # 权限检查
    if current_user.role == "requester":
        if task.created_by != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="您无权访问此任务")
    else:  # worker
        if task.status != "annotating":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="该任务当前不接受标注")

    return task


@router.get("/{task_id}/pre-annotation-status")
async def get_pre_annotation_status(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 查询任务
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="任务不存在")

    # 权限检查
    if current_user.role == "requester":
        if task.created_by != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="您无权访问此任务")
    else:  # worker
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="仅标注请求方可以查看预标注状态")

    # 计算预标注进度
    total_images = db.query(func.count(models.TaskImage.id)).filter(
        models.TaskImage.task_id == task_id
    ).scalar() or 0

    processed_images = db.query(func.count(models.TaskImage.id)).filter(
        models.TaskImage.task_id == task_id,
        models.TaskImage.pre_annotations != "[]"
    ).scalar() or 0

    return {
        "status": task.status,
        "total_images": total_images,
        "processed_images": processed_images
    }


@router.get("/{task_id}/annotations", response_model=List[AnnotationRecord])
async def get_task_annotations(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 查询任务
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="任务不存在")

    # 权限检查：仅任务创建者可查看标注记录
    if task.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="您无权查看此任务的标注记录")

    # 查询标注记录
    annotations = db.query(
        models.Annotation.id,
        models.Annotation.task_id,
        models.Annotation.image_id,
        models.Annotation.worker_id,
        User.username.label("worker_name"),
        models.Annotation.annotations,
        models.Annotation.created_at
    ).join(
        User, models.Annotation.worker_id == User.id
    ).filter(
        models.Annotation.task_id == task_id
    ).order_by(
        models.Annotation.created_at.desc()
    ).all()

    return annotations


@router.delete("/{task_id}")
async def delete_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 查询任务
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="任务不存在")

    # 权限检查：仅任务创建者可删除
    if task.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="您无权删除此任务")

    # 删除限制检查
    if task.status not in ["pending", "annotating"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="任务已完成或已关闭，无法删除")

    # 删除任务相关文件
    task_dir = os.path.join(settings.UPLOAD_DIR, str(task_id))
    if os.path.exists(task_dir):
        try:
            shutil.rmtree(task_dir)
        except Exception as e:
            print(f"删除任务目录失败: {e}")

    # 删除任务及其关联记录
    db.delete(task)
    db.commit()

    return {"message": "任务已删除"}
