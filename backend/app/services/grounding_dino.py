import torch
import uuid
import logging
from PIL import Image
from transformers import AutoProcessor, AutoModelForZeroShotObjectDetection

logger = logging.getLogger(__name__)


class GroundingDINOService:
    """Grounding DINO 预标注服务（单例，懒加载，CPU推理）"""

    _instance = None

    def __init__(self):
        self.model = None
        self.processor = None
        self.device = "cpu"
        self.model_path = "/app/models"  # 挂载的权重目录

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def load_model(self):
        """
        懒加载模型。
        使用 AutoModelForZeroShotObjectDetection.from_pretrained 加载。
        processor 使用 AutoProcessor.from_pretrained 加载。
        都从 self.model_path 本地目录加载，不联网下载。
        强制 device="cpu"，torch_dtype=torch.float32。
        加载成功后打印日志 "Grounding DINO model loaded on CPU"。
        加载失败打印 warning 日志，不抛异常。
        """
        if self.model is not None:
            return

        try:
            logger.info(f"Loading Grounding DINO model from {self.model_path}...")
            self.processor = AutoProcessor.from_pretrained(
                self.model_path,
                local_files_only=True
            )
            self.model = AutoModelForZeroShotObjectDetection.from_pretrained(
                self.model_path,
                local_files_only=True,
                torch_dtype=torch.float32
            )
            self.model = self.model.to("cpu")
            logger.info("Grounding DINO model loaded on CPU")
        except Exception as e:
            logger.warning(f"Failed to load Grounding DINO model: {e}")
            self.model = None
            self.processor = None

    def predict(self, image_path: str, classes: list[str],
                box_threshold: float = 0.3,
                text_threshold: float = 0.25) -> list[dict]:
        """
        对单张图片进行预标注。

        流程：
        1. 如果 model 未加载，先调用 load_model()
        2. 如果 model 加载失败（仍为None），返回空列表
        3. 用 PIL.Image.open 打开图片，转为 RGB
        4. 构建 text prompt：将 classes 用 ". " 连接，末尾加 "."
           例如 classes=["cat","dog"] → text="cat. dog."
        5. 用 processor 处理 image 和 text，传入模型
        6. 用 processor.post_process_grounded_object_detection 后处理
           参数 box_threshold 和 text_threshold 按传入值
           target_sizes 用图片原始尺寸
        7. 解析结果：
           - boxes: 模型返回的是像素坐标 [x_min, y_min, x_max, y_max]
           - 需要归一化到 [0,1]：除以图片宽高
           - labels: 模型返回的文本标签，需要匹配到 classes 中最接近的类别
             （简单做法：如果返回的label包含某个class名称，就用那个class名称）
           - scores: 置信度
        8. 返回列表，每项格式：
           {
               "id": str(uuid.uuid4()),
               "label": "cat",
               "bbox": [x_min_norm, y_min_norm, x_max_norm, y_max_norm],
               "confidence": 0.85
           }
        9. 整个过程用 try-except 包裹，异常时 log error 并返回空列表
        10. 推理时使用 torch.no_grad()
        """
        if self.model is None:
            self.load_model()

        if self.model is None or self.processor is None:
            return []

        try:
            with torch.no_grad():
                # 打开图片
                image = Image.open(image_path).convert("RGB")
                img_width, img_height = image.size

                # 构建 text prompt
                text = ". ".join(classes) + "."

                # 预处理
                inputs = self.processor(images=image, text=text, return_tensors="pt")

                # 推理
                outputs = self.model(**inputs)

                # 后处理
                results = self.processor.post_process_grounded_object_detection(
                    outputs,
                    inputs.input_ids,
                    box_threshold=box_threshold,
                    text_threshold=text_threshold,
                    target_sizes=[(img_height, img_width)]
                )

                # 解析结果
                annotations = []
                result = results[0]
                boxes = result["boxes"]
                labels = result["labels"]
                scores = result["scores"]

                for box, label, score in zip(boxes, labels, scores):
                    # 转换为 list 和 浮点数
                    box = box.cpu().numpy().tolist()
                    x_min, y_min, x_max, y_max = box

                    # 归一化到 [0,1]
                    x_min_norm = round(x_min / img_width, 4)
                    y_min_norm = round(y_min / img_height, 4)
                    x_max_norm = round(x_max / img_width, 4)
                    y_max_norm = round(y_max / img_height, 4)

                    # 转换为 x, y, width, height 格式
                    width = round(x_max_norm - x_min_norm, 4)
                    height = round(y_max_norm - y_min_norm, 4)

                    # 标签匹配：找到包含在 classes 中的类别
                    matched_label = label
                    for cls in classes:
                        if cls.lower() in label.lower():
                            matched_label = cls
                            break

                    annotations.append({
                        "id": str(uuid.uuid4()),
                        "label": matched_label,
                        "bbox": {"x": x_min_norm, "y": y_min_norm, "width": width, "height": height},
                        "score": round(score.item(), 4)
                    })

                return annotations

        except Exception as e:
            logger.error(f"Error during prediction: {e}")
            return []
