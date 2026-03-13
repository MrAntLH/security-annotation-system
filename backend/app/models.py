from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(128), nullable=False)
    role = Column(String(20), nullable=False)  # "requester" or "worker"
    weight = Column(Float, default=1.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    created_tasks = relationship("Task", back_populates="creator", foreign_keys="Task.created_by")
    annotations = relationship("Annotation", back_populates="worker")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, default="")
    label_classes = Column(Text, nullable=False)  # JSON array string
    target_count = Column(Integer, nullable=False)
    current_count = Column(Integer, default=0)
    status = Column(String(20), default="pending")  # pending / pre_annotating / annotating / completed
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    creator = relationship("User", back_populates="created_tasks", foreign_keys=[created_by])
    images = relationship("TaskImage", back_populates="task", cascade="all, delete-orphan")
    annotations = relationship("Annotation", back_populates="task", cascade="all, delete-orphan")
    truth_results = relationship("TruthResult", back_populates="task", cascade="all, delete-orphan")


class TaskImage(Base):
    __tablename__ = "task_images"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    task_id = Column(Integer, ForeignKey("tasks.id"))
    filename = Column(String(255))
    filepath = Column(String(500))
    pre_annotations = Column(Text, default="[]")  # JSON string

    # Relationships
    task = relationship("Task", back_populates="images")
    annotations = relationship("Annotation", back_populates="image")
    truth_results = relationship("TruthResult", back_populates="image")


class Annotation(Base):
    __tablename__ = "annotations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    task_id = Column(Integer, ForeignKey("tasks.id"))
    image_id = Column(Integer, ForeignKey("task_images.id"))
    worker_id = Column(Integer, ForeignKey("users.id"))
    annotations = Column(Text, nullable=False)  # JSON string
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    task = relationship("Task", back_populates="annotations")
    image = relationship("TaskImage", back_populates="annotations")
    worker = relationship("User", back_populates="annotations")


class TruthResult(Base):
    __tablename__ = "truth_results"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    task_id = Column(Integer, ForeignKey("tasks.id"))
    image_id = Column(Integer, ForeignKey("task_images.id"))
    result = Column(Text, nullable=False)  # JSON string
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    task = relationship("Task", back_populates="truth_results")
    image = relationship("TaskImage", back_populates="truth_results")
