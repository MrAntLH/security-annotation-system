from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List


class UserCreate(BaseModel):
    username: str
    password: str
    role: str


class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    weight: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ==================== Task 相关 ====================

class TaskImageResponse(BaseModel):
    id: int
    filename: str
    filepath: str
    pre_annotations: str

    model_config = ConfigDict(from_attributes=True)


class TaskResponse(BaseModel):
    id: int
    title: str
    description: str
    label_classes: str
    target_count: int
    current_count: int
    status: str
    created_by: int
    created_at: datetime
    images: List[TaskImageResponse]

    model_config = ConfigDict(from_attributes=True)


class TaskListItem(BaseModel):
    id: int
    title: str
    description: str
    status: str
    target_count: int
    current_count: int
    image_count: int
    created_by: int
    creator_name: str
    created_at: datetime


# ==================== Annotation 相关 ====================

class SingleAnnotation(BaseModel):
    id: str
    label: str
    bbox: List[float]
    source: str
    action: str


class ImageAnnotationItem(BaseModel):
    image_id: int
    annotations: List[SingleAnnotation]


class AnnotationSubmit(BaseModel):
    task_id: int
    image_annotations: List[ImageAnnotationItem]


class AnnotationRecord(BaseModel):
    id: int
    task_id: int
    image_id: int
    worker_id: int
    worker_name: str
    annotations: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==================== 统计相关 ====================

class TaskStats(BaseModel):
    total_tasks: int
    pending_tasks: int
    annotating_tasks: int
    completed_tasks: int


class WorkerStats(BaseModel):
    my_annotations: int
    available_tasks: int
    my_weight: float
