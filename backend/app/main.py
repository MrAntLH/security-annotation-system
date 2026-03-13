import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

from .config import settings
from .database import engine
from . import models
from .routers import user, task, annotation

# 确保上传目录存在
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

# 创建所有数据库表
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI标注系统")


# CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 挂载静态文件
app.mount("/api/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# 注册路由
app.include_router(user.router, prefix="/api")
app.include_router(task.router, prefix="/api")
app.include_router(annotation.router, prefix="/api")


# 健康检查
@app.get("/api/health")
async def health_check():
    return JSONResponse({"status": "ok"})
