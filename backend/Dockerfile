ARG BASE_IMAGE=pytorch/pytorch:latest
FROM ${BASE_IMAGE}

# 安装系统依赖
RUN apt-get update && apt-get install -y libgl1-mesa-glx libglib2.0-0 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 复制并安装依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 创建数据和模型目录
RUN mkdir -p /app/data /app/models /app/data/uploads

# 启动命令 - 使用 --reload 支持热重载
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
