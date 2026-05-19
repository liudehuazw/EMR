#!/bin/bash

# ============================================================
# PaddleOCR 升级脚本: 2.7.3 → 3.4.0 (PP-OCRv5)
# 适用于阿里云 ocr-aliyun 容器
# 执行方式: 在阿里云服务器上运行 bash upgrade-paddleocr-v3.sh
# ============================================================

set -e

echo "🔄 PaddleOCR 升级: 2.7.3 → 3.4.0 (PP-OCRv5)"
echo "================================================"

# Step 1: 检查当前版本
echo ""
echo "📋 Step 1: 检查当前版本..."
echo "当前容器状态:"
docker ps --filter name=ocr-aliyun --format "{{.Status}}"
echo "当前PaddleOCR版本:"
docker exec ocr-aliyun pip list 2>/dev/null | grep -i paddle || echo "未安装"
echo ""

# Step 2: 备份当前容器
echo "💾 Step 2: 备份当前容器..."
docker commit ocr-aliyun ocr-aliyun-backup-$(date +%Y%m%d)
echo "备份镜像已创建: ocr-aliyun-backup-$(date +%Y%m%d)"
echo ""

# Step 3: 创建升级目录
echo "📁 Step 3: 准备升级文件..."
mkdir -p /root/ocr-upgrade
cd /root/ocr-upgrade

# Step 4: 写入新的 main.py (支持v2/v3双API)
cat > main.py << 'MAINEOF'
"""
FastAPI OCR Service
PaddleOCR-based service for medical document recognition
Supports PaddleOCR 3.x (PP-OCRv5) with fallback to 2.x API
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from paddleocr import PaddleOCR
import cv2
import numpy as np
import uvicorn
import logging
from typing import Dict, Any, List, Optional, Tuple
import time
import re
import os
import io
import tempfile
from PIL import Image
import pdf2image

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Detect PaddleOCR version
PADDLEOCR_V3 = False
try:
    import paddleocr
    _ver = getattr(paddleocr, '__version__', '0.0.0')
    PADDLEOCR_V3 = int(_ver.split('.')[0]) >= 3
    logger.info(f"PaddleOCR version: {_ver}, using v3 API: {PADDLEOCR_V3}")
except Exception as e:
    logger.warning(f"Could not detect PaddleOCR version: {e}")

# Initialize FastAPI app
app = FastAPI(
    title="OCR Service",
    description="Medical document OCR recognition service (PP-OCRv5)",
    version="2.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize PaddleOCR (lazy loading)
ocr_engine = None

def get_ocr_engine():
    """Get or create PaddleOCR engine instance (auto-detect v2/v3 API)"""
    global ocr_engine
    if ocr_engine is None:
        logger.info("Initializing PaddleOCR engine...")
        try:
            if PADDLEOCR_V3:
                ocr_engine = PaddleOCR(
                    use_doc_orientation_classify=False,
                    use_doc_unwarping=False,
                    use_textline_orientation=False,
                    text_detection_model_name="PP-OCRv5_mobile_det",
                    text_recognition_model_name="PP-OCRv5_mobile_rec",
                )
                logger.info("PaddleOCR 3.x engine initialized (PP-OCRv5 mobile)")
            else:
                ocr_engine = PaddleOCR(
                    use_angle_cls=True,
                    lang='ch',
                    use_gpu=False,
                    show_log=False,
                )
                logger.info("PaddleOCR 2.x engine initialized")
        except Exception as e:
            logger.error(f"Failed to initialize PaddleOCR: {e}")
            raise HTTPException(status_code=500, detail="OCR engine initialization failed")
    return ocr_engine

def convert_pdf_to_images(pdf_content: bytes) -> List[np.ndarray]:
    """Convert PDF content to list of numpy array images"""
    try:
        images = pdf2image.convert_from_bytes(pdf_content, dpi=200)
        image_arrays = []
        for img in images:
            img_array = np.array(img)
            img_bgr = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
            image_arrays.append(img_bgr)
        logger.info(f"PDF converted to {len(image_arrays)} page(s)")
        return image_arrays
    except Exception as e:
        logger.error(f"Failed to convert PDF to images: {e}")
        raise HTTPException(status_code=500, detail=f"PDF conversion failed: {str(e)}")

def _extract_from_v3_result(result) -> Tuple[List[str], List[float]]:
    """Extract texts and confidences from PaddleOCR 3.x predict() result"""
    texts: List[str] = []
    confidences: List[float] = []
    for res in result:
        rec_texts = None
        rec_scores = None
        if isinstance(res, dict):
            rec_texts = res.get('rec_text', res.get('rec_texts', None))
            rec_scores = res.get('rec_score', res.get('rec_scores', None))
        elif hasattr(res, 'rec_text'):
            rec_texts = res.rec_text
            rec_scores = getattr(res, 'rec_score', None)
        elif hasattr(res, 'rec_texts'):
            rec_texts = res.rec_texts
            rec_scores = getattr(res, 'rec_scores', None)
        if rec_texts is not None and rec_scores is not None:
            for text, score in zip(rec_texts, rec_scores):
                if score > 0.3:
                    texts.append(str(text))
                    confidences.append(float(score))
        else:
            logger.warning(f"[v3] Unknown result: type={type(res)}, dir={[a for a in dir(res) if not a.startswith('_')]}")
            try:
                if hasattr(res, '__iter__'):
                    for item in res:
                        if isinstance(item, (list, tuple)) and len(item) >= 2:
                            if isinstance(item[1], (list, tuple)) and len(item[1]) >= 2:
                                text = str(item[1][0])
                                score = float(item[1][1])
                                if score > 0.3:
                                    texts.append(text)
                                    confidences.append(score)
            except (TypeError, IndexError, ValueError) as ex:
                logger.error(f"[v3] Fallback failed: {ex}")
    return texts, confidences

def _extract_from_v2_result(result) -> Tuple[List[str], List[float]]:
    """Extract texts and confidences from PaddleOCR 2.x ocr() result"""
    texts: List[str] = []
    confidences: List[float] = []
    if result and result[0]:
        for line in result[0]:
            if line and len(line) >= 2:
                text = str(line[1][0])
                confidence = float(line[1][1])
                if confidence > 0.3:
                    texts.append(text)
                    confidences.append(confidence)
    return texts, confidences

def process_image(image: np.ndarray) -> Tuple[List[str], List[float]]:
    """Process single image with PaddleOCR, returns (texts, confidences)"""
    ocr = get_ocr_engine()
    if PADDLEOCR_V3:
        try:
            result = ocr.predict(input=image)
            return _extract_from_v3_result(result)
        except TypeError:
            logger.warning("[v3] predict(numpy) failed, trying temp file...")
            tmp_path = None
            try:
                with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f:
                    tmp_path = f.name
                    cv2.imwrite(tmp_path, image)
                result = ocr.predict(input=tmp_path)
                return _extract_from_v3_result(result)
            finally:
                if tmp_path and os.path.exists(tmp_path):
                    os.unlink(tmp_path)
    else:
        result = ocr.ocr(image, cls=True)
        return _extract_from_v2_result(result)

def extract_dates(text: str) -> List[str]:
    """Extract medical visit dates from OCR text"""
    date_patterns = [
        r'(\d{4}[-/]\d{1,2}[-/]\d{1,2})',
        r'(\d{4}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日)',
        r'(\d{4}\s*年\s*\d{1,2}\s*月\s*\d{1,2}(?!\s*日))',
        r'(\d{4}\.\d{1,2}\.\d{1,2})',
        r'(?<!\d)(\d{8})(?!\d)',
    ]
    context_patterns = [
        r'(?:就诊|就医|门诊|急诊|住院|出院|入院|检查|检验|体检|手术|复诊|复查|随访|报告|开具|签发|采样|送检|打印)[日期时间：:]*\s*(\d{4}[-/年.]\s*\d{1,2}[-/月.]\s*\d{1,2}[日]?)',
        r'(?<!出生)(?<!年龄)(?:日期|时间)[：:]\s*(\d{4}[-/年.]\s*\d{1,2}[-/月.]\s*\d{1,2}[日]?)',
        r'(\d{4}[-/年.]\s*\d{1,2}[-/月.]\s*\d{1,2}[日]?)\s*(?:就诊|就医|门诊|急诊|住院|出院|入院|检查|检验|体检|手术|复诊|复查|随访)',
    ]
    exclude_patterns = [
        r'(?:出生日期|出生时间|出生年月|生日)[：:]*\s*(\d{4}[-/年.]\s*\d{1,2}[-/月.]\s*\d{1,2}[日]?)',
    ]
    excluded_dates = set()
    for pattern in exclude_patterns:
        for m in re.finditer(pattern, text):
            date_str = m.group(1) if m.lastindex and m.lastindex >= 1 else m.group(0)
            normalized = normalize_date(date_str)
            if normalized:
                excluded_dates.add(normalized)
    all_dates = []
    for pattern in context_patterns:
        for m in re.finditer(pattern, text):
            date_str = m.group(1) if m.lastindex and m.lastindex >= 1 else m.group(0)
            normalized = normalize_date(date_str)
            if normalized and normalized not in all_dates:
                all_dates.insert(0, normalized)
    for pattern in date_patterns:
        for m in re.finditer(pattern, text):
            date_str = m.group(1)
            normalized = normalize_date(date_str)
            if normalized and normalized not in all_dates:
                all_dates.append(normalized)
    if excluded_dates:
        priority = [d for d in all_dates if d not in excluded_dates]
        deprioritized = [d for d in all_dates if d in excluded_dates]
        all_dates = priority + deprioritized
    return filter_valid_dates(all_dates)

def normalize_date(date_str: str) -> Optional[str]:
    """Normalize various date formats to YYYY-MM-DD"""
    s = date_str.strip().replace(' ', '')
    m = re.match(r'(\d{4})年(\d{1,2})月(\d{1,2})日?', s)
    if m:
        return f"{m.group(1)}-{int(m.group(2)):02d}-{int(m.group(3)):02d}"
    m = re.match(r'(\d{4})\.(\d{1,2})\.(\d{1,2})', s)
    if m:
        return f"{m.group(1)}-{int(m.group(2)):02d}-{int(m.group(3)):02d}"
    m = re.match(r'(\d{4})/(\d{1,2})/(\d{1,2})', s)
    if m:
        return f"{m.group(1)}-{int(m.group(2)):02d}-{int(m.group(3)):02d}"
    m = re.match(r'(\d{4})-(\d{1,2})-(\d{1,2})', s)
    if m:
        return f"{m.group(1)}-{int(m.group(2)):02d}-{int(m.group(3)):02d}"
    m = re.match(r'(\d{4})(\d{2})(\d{2})', s)
    if m:
        year, month, day = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if 1 <= month <= 12 and 1 <= day <= 31:
            return f"{year}-{month:02d}-{day:02d}"
    return None

def filter_valid_dates(dates: List[str]) -> List[str]:
    """Filter out invalid or unreasonable dates"""
    from datetime import datetime, timedelta
    valid = []
    now = datetime.now()
    max_future = now + timedelta(days=365)
    min_past = datetime(1900, 1, 1)
    for d in dates:
        try:
            dt = datetime.strptime(d, '%Y-%m-%d')
            if min_past <= dt <= max_future:
                valid.append(d)
        except ValueError:
            continue
    return valid

@app.get("/")
async def root():
    return {"message": "OCR Service is running", "version": "2.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": time.time()}

@app.get("/info")
async def service_info():
    import paddleocr as _p
    return {
        "service": "OCR Service",
        "engine": f"PaddleOCR {getattr(_p, '__version__', 'unknown')}",
        "api_mode": "v3 (PP-OCRv5)" if PADDLEOCR_V3 else "v2 (legacy)",
        "version": "2.0.0",
        "supported_formats": ["jpg", "jpeg", "png", "bmp", "pdf"]
    }

@app.post("/ocr/image")
async def ocr_image(file: UploadFile = File(...)) -> Dict[str, Any]:
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/bmp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}")
    content = await file.read()
    file_size = len(content)
    if file_size > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")
    try:
        start_time = time.time()
        np_arr = np.frombuffer(content, np.uint8)
        image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if image is None:
            raise HTTPException(status_code=400, detail="Failed to decode image file")
        logger.info(f"Processing image: {file.filename}, size: {file_size} bytes")
        texts, confidences = process_image(image)
        full_text = "\n".join(texts)
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
        extracted_dates = extract_dates(full_text)
        processing_time = time.time() - start_time
        response = {
            "success": True,
            "filename": file.filename,
            "text": full_text,
            "confidence": round(avg_confidence, 4),
            "confidence_scores": [round(c, 4) for c in confidences],
            "extracted_dates": extracted_dates,
            "processing_time": round(processing_time, 2),
            "line_count": len(texts),
            "timestamp": time.time()
        }
        logger.info(f"OCR completed: {file.filename}, lines: {len(texts)}, time: {processing_time:.2f}s")
        return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OCR failed for {file.filename}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")

@app.post("/ocr/pdf")
async def ocr_pdf(file: UploadFile = File(...)) -> Dict[str, Any]:
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}")
    content = await file.read()
    file_size = len(content)
    if file_size > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")
    try:
        start_time = time.time()
        logger.info(f"Processing PDF: {file.filename}, size: {file_size} bytes")
        images = convert_pdf_to_images(content)
        all_texts = []
        all_confidences = []
        for i, image in enumerate(images):
            logger.info(f"Processing page {i+1}/{len(images)}")
            texts, confidences = process_image(image)
            all_texts.extend(texts)
            all_confidences.extend(confidences)
        full_text = "\n".join(all_texts)
        avg_confidence = sum(all_confidences) / len(all_confidences) if all_confidences else 0.0
        extracted_dates = extract_dates(full_text)
        processing_time = time.time() - start_time
        response = {
            "success": True,
            "filename": file.filename,
            "text": full_text,
            "confidence": round(avg_confidence, 4),
            "confidence_scores": [round(c, 4) for c in all_confidences],
            "extracted_dates": extracted_dates,
            "processing_time": round(processing_time, 2),
            "line_count": len(all_texts),
            "page_count": len(images),
            "timestamp": time.time()
        }
        logger.info(f"PDF OCR completed: {file.filename}, pages: {len(images)}, lines: {len(all_texts)}, time: {processing_time:.2f}s")
        return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PDF OCR failed for {file.filename}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"PDF OCR processing failed: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info"
    )
MAINEOF

# Step 5: 写入新的 requirements.txt
cat > requirements.txt << 'REQEOF'
fastapi>=0.110.0
uvicorn>=0.25.0
python-multipart>=0.0.9
pillow>=10.0.0
paddlepaddle>=3.0.0
paddleocr>=3.4.0
pdf2image>=1.17.0
opencv-python-headless>=4.8.1.78
numpy>=1.24.3,<2.0
REQEOF

# Step 6: 写入新的 Dockerfile
cat > Dockerfile << 'DOCKEOF'
FROM python:3.9-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV FLAGS_use_mkldnn=0
ENV FLAGS_memory_fraction_of_eager_deletion=0.5

RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libgl1-mesa-dev \
    poppler-utils \
    wget \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --upgrade pip setuptools wheel -i https://mirrors.aliyun.com/pypi/simple/ --trusted-host mirrors.aliyun.com

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt -i https://mirrors.aliyun.com/pypi/simple/ --trusted-host mirrors.aliyun.com

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
DOCKEOF

echo "✅ 升级文件准备完毕"
echo ""

# Step 7: 构建新镜像
echo "🔨 Step 7: 构建新Docker镜像 (这可能需要5-10分钟)..."
docker build -t ocr-aliyun-v3 .

echo ""
echo "🔄 Step 8: 替换运行中的容器..."

# 停止旧容器
docker stop ocr-aliyun
docker rm ocr-aliyun

# 启动新容器
docker run -d \
  --name ocr-aliyun \
  --restart unless-stopped \
  --memory="1.5g" \
  -p 8000:8000 \
  ocr-aliyun-v3

echo "⏳ 等待服务启动 (首次加载模型可能需要30-60秒)..."
sleep 30

# Step 9: 验证
echo ""
echo "🧪 Step 9: 验证升级结果..."

# 健康检查
if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ 健康检查通过"
else
    echo "❌ 健康检查失败! 查看日志:"
    docker logs --tail 50 ocr-aliyun
    echo ""
    echo "⚠️ 如需回滚，执行:"
    echo "  docker stop ocr-aliyun"
    echo "  docker rm ocr-aliyun"
    echo "  docker run -d --name ocr-aliyun --restart unless-stopped --memory=1.5g -p 8000:8000 ocr-aliyun-backup-$(date +%Y%m%d)"
    exit 1
fi

# 版本信息
echo ""
echo "📋 服务信息:"
curl -s http://localhost:8000/info | python3 -m json.tool 2>/dev/null || curl -s http://localhost:8000/info

echo ""
echo "📋 容器内PaddleOCR版本:"
docker exec ocr-aliyun pip list 2>/dev/null | grep -i paddle

echo ""
echo "💾 内存使用:"
docker stats --no-stream ocr-aliyun --format "{{.MemUsage}}"

echo ""
echo "================================================"
echo "🎉 PaddleOCR 升级完成!"
echo "   旧版本: paddleocr 2.7.3 + paddlepaddle 2.6.2"
echo "   新版本: paddleocr 3.4.0 (PP-OCRv5)"
echo ""
echo "📖 测试OCR: 上传一张报告图片到前端页面验证"
echo "📖 API文档: http://$(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_IP'):8000/docs"
echo ""
echo "⚠️ 如需回滚到旧版本:"
echo "   docker stop ocr-aliyun"
echo "   docker rm ocr-aliyun"
echo "   docker run -d --name ocr-aliyun --restart unless-stopped --memory=1.5g -p 8000:8000 ocr-aliyun-backup-$(date +%Y%m%d)"
echo "================================================"
