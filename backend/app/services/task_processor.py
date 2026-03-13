import threading
import json
import logging
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Task, TaskImage
from app.services.grounding_dino import GroundingDINOService

logger = logging.getLogger(__name__)


def process_pre_annotation(task_id: int):
    """
    在后台线程中执行预标注。必须自己创建独立的数据库 session。

    流程：
    1. 创建新的 db session
    2. 查询 task，将 status 更新为 "pre_annotating"，commit
    3. 获取 GroundingDINOService 单例
    4. 解析 task.label_classes（JSON字符串）得到类别列表
    5. 查询该 task 的所有 TaskImage
    6. 逐张图片调用 service.predict()：
       - image_path 拼接为完整路径："/app/data/" + image.filepath
       - 传入类别列表
       - 将返回的预标注结果 json.dumps 后存入 image.pre_annotations
       - 每处理完一张就 commit 一次（这样前端可以看到部分进度）
       - 打印日志：f"Image {image.id} pre-annotated: {len(results)} objects"
    7. 全部完成后，将 task.status 更新为 "annotating"，commit
    8. 异常处理：
       - 如果模型加载失败或某张图片处理失败，跳过继续处理下一张
       - 最终无论如何都将 status 设为 "annotating"（允许纯人工标注）
       - 所有异常打印 logger.error
    9. finally 中关闭 db session
    """
    db: Session = None
    try:
        db = SessionLocal()
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            logger.error(f"Task {task_id} not found")
            return

        task.status = "pre_annotating"
        db.commit()

        service = GroundingDINOService.get_instance()
        label_classes = json.loads(task.label_classes or '[]')
        if not label_classes:
            logger.warning(f"Task {task_id} has no label classes, skipping pre-annotation")
            task.status = "annotating"
            db.commit()
            return

        images = db.query(TaskImage).filter(TaskImage.task_id == task_id).all()
        for image in images:
            try:
                image_path = f"/app/data/{image.filepath}"
                # 使用较低的阈值来获取更多检测结果
                results = service.predict(
                    image_path,
                    label_classes,
                    box_threshold=0.15,
                    text_threshold=0.1
                )
                image.pre_annotations = json.dumps(results)
                db.commit()
                logger.info(f"Image {image.id} pre-annotated: {len(results)} objects")
            except Exception as e:
                logger.error(f"Error processing image {image.id}: {e}")
                db.rollback()
                continue

        task.status = "annotating"
        db.commit()
        logger.info(f"Pre-annotation completed for task {task_id}")

    except Exception as e:
        logger.error(f"Error in pre-annotation thread for task {task_id}: {e}")
        if db:
            try:
                task = db.query(Task).filter(Task.id == task_id).first()
                if task:
                    task.status = "annotating"
                    db.commit()
            except Exception as commit_error:
                logger.error(f"Failed to update task status: {commit_error}")
    finally:
        if db:
            db.close()


def start_pre_annotation(task_id: int):
    """启动后台线程执行预标注"""
    thread = threading.Thread(target=process_pre_annotation, args=(task_id,))
    thread.daemon = True
    thread.start()
    logger.info(f"Pre-annotation thread started for task {task_id}")
