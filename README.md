# 在线标注系统 - Grounding DINO 预标注版

## 项目概述

在线标注系统是一个用于图像标注任务管理的 web 应用，集成了 Grounding DINO AI 预标注功能，支持标注任务的创建、管理和执行。系统支持两种用户角色：
- **Requester（标注请求方）**：创建标注任务，上传图片，设置标注类别，查看任务进度和结果
- **Worker（标注工人）**：查看可标注任务，执行标注工作，提交标注结果

## 技术栈

### 前端
- **React 18**: 前端框架
- **Vite**: 构建工具（支持热重载）
- **react-router-dom v6**: 路由管理
- **Axios**: HTTP 客户端
- **Ant Design 5.x**: UI 组件库
- **Day.js**: 日期处理
- **UUID**: 唯一ID生成

### 后端
- **FastAPI**: Web 框架
- **Uvicorn**: ASGI 服务器（支持热重载）
- **SQLAlchemy**: ORM 框架
- **Python-JOSE**: JWT 认证
- **Pydantic**: 数据验证

### AI 模型
- **Grounding DINO**: 零样本目标检测模型
- **Transformers 4.45.2**: HuggingFace 模型库
- **PyTorch**: 深度学习框架

## 项目结构

```
annotation-system/
├── backend/                 # 后端代码
│   ├── app/
│   │   ├── routers/        # API 路由
│   │   ├── services/       # 业务逻辑（包含 Grounding DINO）
│   │   ├── models.py       # 数据库模型
│   │   ├── schemas.py      # Pydantic 模型
│   │   ├── database.py     # 数据库配置
│   │   ├── auth.py         # 认证逻辑
│   │   ├── config.py       # 配置文件
│   │   └── main.py         # FastAPI 入口
│   ├── data/               # 数据目录（挂载）
│   │   ├── annotation.db   # SQLite 数据库
│   │   └── uploads/       # 上传图片存储
│   ├── models/             # 模型权重目录（挂载）
│   ├── requirements.txt    # Python 依赖
│   └── Dockerfile         # Docker 配置
├── frontend/               # 前端代码
│   ├── src/
│   │   ├── api/            # API 接口封装
│   │   ├── pages/          # 页面组件
│   │   │   ├── requester/ # Requester 角色页面
│   │   │   └── worker/    # Worker 角色页面
│   │   ├── router/         # 路由配置
│   │   ├── styles/         # 全局样式
│   │   ├── App.jsx         # 根组件
│   │   └── main.jsx        # 应用入口
│   ├── package.json
│   ├── vite.config.js
│   ├── Dockerfile.dev
│   └── Dockerfile
├── docker-compose.yml      # Docker Compose 配置
└── README.md
```

## 快速开始

### 前置要求

1. **Docker & Docker Compose**：请确保已安装
2. **Grounding DINO 模型权重**：需要下载模型权重文件

### 模型权重准备

将 Grounding DINO 的权重文件放置在 `backend/models/` 目录下，需要包含以下文件：

```
backend/models/
├── config.json
├── pytorch_model.bin  或  model.safetensors
├── tokenizer.json
├── tokenizer_config.json
├── vocab.txt
├── special_tokens_map.json
└── preprocessor_config.json
```

### 启动系统

使用 Docker Compose 一键启动：

```bash
# 在项目根目录执行
docker-compose up -d --build
```

### 访问地址

- **前端界面**：http://localhost:3000
- **后端 API**：http://localhost:8000
- **API 文档**：http://localhost:8000/docs

### 默认账户

系统初始化后有两个测试账户：

**Requester（标注请求方）**：
- 用户名：`requester`
- 密码：`123456`

**Worker（标注工人）**：
- 用户名：`worker`
- 密码：`123456`

## 主要功能

### 1. Requester 功能

#### 创建任务流程
1. 登录 Requester 账户
2. 进入"创建任务"页面
3. 填写任务信息：
   - **任务标题**：也会用于 Grounding DINO 预标注的文本提示
   - **标注类别**：用逗号分隔，例如：`person, car, dog, bicycle`
   - **描述**：任务说明
   - **目标收集数**：需要多少人标注
4. 上传图片（支持批量上传）
5. 点击"创建任务"

#### 预标注过程
- 任务创建后自动进入 **pending** 状态
- 系统后台启动 Grounding DINO 进行预标注
- 任务状态变为 **pre_annotating**，页面显示进度条
- 预标注完成后任务变为 **annotating**，可接受工人标注
- 页面会自动轮询预标注进度，无需刷新

#### 任务管理
- 查看所有任务列表和状态
- 查看任务详情和标注进度
- 查看任务图片和预标注结果
- 删除任务（仅在 pending/annotating 状态）

### 2. Worker 功能

#### 标注任务大厅
- 查看所有可标注的任务
- 查看任务详情和标注类别
- 选择任务开始标注

#### 标注画布
标注页面提供完整的标注功能：

**界面布局**：
- **左侧**：图片展示区，带标注框叠加
- **右侧**：控制面板和标注框详情
- **底部**：缩略图导航和操作栏

**标注框状态**：
- 🟢 **保留（kept）**：绿色边框，确认保留该标注
- 🟠 **修正（modified）**：橙色边框，已修改过的标注
- 🔵 **新增（addition）**：蓝色边框，新增的标注
- ⚪ **待审核（pending）**：灰色边框，尚未处理
- ❌ **删除（deleted）**：隐藏状态，不显示

**操作按钮**：
- **保留标注**：确认该预标注框正确
- **删除标注**：删除该预标注框
- **修正标注**：标记为需要修改，可编辑坐标和类别
- **新增标注框**：手动添加新的标注框

**标注框详情编辑**：
- 选择标注框后可编辑：
  - **类别**：下拉选择标注类别
  - **置信度**：显示模型置信度（只读）
  - **归一化坐标**：x, y, width, height（0-1 范围）

**键盘快捷键**：
- `K` / `k`：保留当前选中的标注框
- `D` / `d`：删除当前选中的标注框
- `M` / `m`：修正当前选中的标注框
- `←`（左箭头）：上一张图片
- `→`（右箭头）：下一张图片
- `S` / `s`：提交所有标注

**缩略图导航**：
- 底部显示所有图片的缩略图
- 点击快速切换图片
- 当前图片高亮显示

### 3. Grounding DINO 预标注

**预标注流程**：
1. 任务创建时状态为 `pending`
2. 后台线程启动，加载 Grounding DINO 模型
3. 任务状态更新为 `pre_annotating`
4. 逐张图片进行推理：
   - 使用任务的标注类别作为文本提示
   - 检测图片中的物体
   - 将检测结果存储在数据库中
   - 每处理完一张就保存（前端可看到进度）
5. 所有图片处理完成后，任务状态变为 `annotating`

**预标注参数**：
- `box_threshold`：0.15（降低以获取更多检测结果）
- `text_threshold`：0.1（文本匹配阈值）

**标注框格式**：
```json
{
  "id": "uuid",
  "label": "person",
  "bbox": {
    "x": 0.1,
    "y": 0.2,
    "width": 0.3,
    "height": 0.4
  },
  "score": 0.85
}
```

## 开发说明

### 后端开发

**热重载**：
后端使用 Uvicorn 的 `--reload` 模式，代码修改后自动生效。

**查看后端日志**：
```bash
docker logs -f annotation-system-backend-1
```

**进入后端容器**：
```bash
docker exec -it annotation-system-backend-1 bash
```

### 前端开发

**热重载**：
前端使用 Vite，代码修改后自动刷新页面。

**查看前端日志**：
```bash
docker logs -f annotation-system-frontend-1
```

### 修改模型参数

**调整预标注阈值**：
编辑 `backend/app/services/task_processor.py` 中的参数：
```python
results = service.predict(
    image_path,
    label_classes,
    box_threshold=0.15,   # 调整框阈值
    text_threshold=0.1     # 调整文本阈值
)
```

## 目录挂载说明

Docker Compose 配置了以下挂载卷：

```yaml
volumes:
  - ./backend/app:/app/app           # 后端代码（热重载）
  - ./backend/data:/app/data         # 数据目录（持久化）
  - ./backend/models:/app/models     # 模型权重（预加载）
  - ./frontend:/app                  # 前端代码（热重载）
  - /app/node_modules                 # 前端依赖（避免覆盖）
```

## 常见问题

### 1. 预标注只检测到很少的物体
**解决方法**：降低阈值，编辑 `backend/app/services/task_processor.py` 中的参数。

### 2. 前端页面报错：Element type is invalid
**原因**：Ant Design 5.x 中 `Input.Number` 已被移除
**解决方法**：使用 `InputNumber` 组件（注意没有点）

### 3. 模型加载失败
**检查**：确认 `backend/models/` 目录包含所有必要的权重文件
**解决方法**：重新下载 Grounding DINO 权重并放置在正确位置

### 4. 热重载不工作
**后端**：确认代码在 `backend/app/` 目录下（已挂载）
**前端**：确认代码在 `frontend/` 目录下（已挂载）
**解决方法**：可以尝试重启容器：
```bash
docker-compose restart
```

### 5. 数据库数据丢失
**原因**：如果没有正确挂载 `data` 目录，容器删除后数据会丢失
**解决方法**：确保 `docker-compose.yml` 中有正确的 volume 配置

## 技术细节

### 任务状态流转

```
pending → pre_annotating → annotating → completed
  │         │                  │              │
  │         │                  │              └─ 标注完成
  │         │                  └─ 预标注完成，可接受标注
  │         └─ 正在进行 Grounding DINO 预标注
  └─ 任务刚创建，等待启动预标注
```

### 标注框决策流程

Worker 对每个预标注框有三种处理方式：
1. **保留（K）**：确认框正确，直接使用
2. **删除（D）**：框错误，丢弃不用
3. **修正（M）**：框需要调整，可修改坐标或类别
4. **新增**：手动添加新的标注框

提交时只保留状态为 `kept`、`modified`、`addition` 的标注框。

## 项目特点

✅ **AI 预标注**：集成 Grounding DINO 零样本检测
✅ **高效标注**：预标注 + 人工审核模式
✅ **键盘快捷键**：支持 K/D/M/方向键/S 快速操作
✅ **实时进度**：预标注进度实时更新
✅ **热重载开发**：前后端都支持代码热重载
✅ **响应式 UI**：使用 Ant Design 5.x 专业界面
✅ **完整流程**：从任务创建到标注完成的闭环
✅ **数据持久化**：数据库和文件都挂载到宿主机

## 开发建议

1. **开发时使用 VSCode**：配置 ESLint 和 Prettier
2. **测试不同角色**：使用 requester 和 worker 两个账户测试完整流程
3. **查看日志**：遇到问题先查看容器日志
4. **模型权重**：确保 `backend/models/` 目录有完整的权重文件
5. **阈值调整**：根据实际需求调整预标注的置信度阈值

## License

本项目仅供学习和研究使用。
