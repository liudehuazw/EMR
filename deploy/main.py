"""
FastAPI OCR Service - Cloud Edition
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
    title="OCR Service - Cloud Edition",
    description="Medical document OCR recognition service (PP-OCRv5)",
    version="2.0.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OCR engine instance (pre-loaded at startup)
ocr_engine = None

def get_ocr_engine():
    """Return the pre-loaded OCR engine instance"""
    return ocr_engine

@app.on_event("startup")
async def startup_preload_ocr():
    """Pre-load OCR engine at application startup to avoid first-request timeout"""
    global ocr_engine
    logger.info("Pre-loading PaddleOCR engine at startup...")
    try:
        if PADDLEOCR_V3:
            ocr_engine = PaddleOCR(
                use_doc_orientation_classify=False,
                use_doc_unwarping=False,
                use_textline_orientation=False,
                text_detection_model_name="PP-OCRv5_mobile_det",
                text_recognition_model_name="PP-OCRv5_mobile_rec",
            )
            logger.info("PaddleOCR 3.x engine pre-loaded (PP-OCRv5 mobile)")
        else:
            ocr_engine = PaddleOCR(
                use_angle_cls=True,
                lang='ch',
                use_gpu=False,
                show_log=False,
            )
            logger.info("PaddleOCR 2.x engine pre-loaded")
    except Exception as e:
        logger.error(f"Failed to pre-load PaddleOCR engine: {e}")
        # Don't crash the server; engine will be None and requests will return 500

def convert_pdf_to_images(pdf_content: bytes, dpi: int = 150) -> List[np.ndarray]:
    """Convert PDF content to list of numpy array images"""
    try:
        images = pdf2image.convert_from_bytes(pdf_content, dpi=dpi)
        image_arrays = []
        for img in images:
            img_array = np.array(img)
            img_bgr = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
            image_arrays.append(img_bgr)
        logger.info(f"PDF converted to {len(image_arrays)} page(s) at {dpi} DPI")
        return image_arrays
    except Exception as e:
        logger.error(f"Failed to convert PDF to images at {dpi} DPI: {e}")
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
            logger.warning(f"[v3] Unknown result structure: type={type(res)}, "
                           f"dir={[a for a in dir(res) if not a.startswith('_')]}")
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
                logger.error(f"[v3] Fallback iteration failed: {ex}")
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
    """
    Extract medical visit dates from OCR text.
    Supports multiple date formats commonly found in Chinese medical documents.
    """
    date_patterns = [
        # YYYY-MM-DD or YYYY/MM/DD
        r'(\d{4}[-/]\d{1,2}[-/]\d{1,2})',
        # YYYY年MM月DD日
        r'(\d{4}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日)',
        # YYYY年MM月DD (without 日)
        r'(\d{4}\s*年\s*\d{1,2}\s*月\s*\d{1,2}(?!\s*日))',
        # YYYY.MM.DD
        r'(\d{4}\.\d{1,2}\.\d{1,2})',
        # YYYYMMDD (8 consecutive digits)
        r'(?<!\d)(\d{8})(?!\d)',
    ]
    
    # Medical keyword context patterns (higher priority)
    # Note: exclude birth date keywords to avoid confusion
    context_patterns = [
        r'(?:就诊|就医|门诊|急诊|住院|出院|入院|检查|检验|体检|手术|复诊|复查|随访|报告|开具|签发|采样|送检|打印)[日期时间：:]*\s*(\d{4}[-/年.]\s*\d{1,2}[-/月.]\s*\d{1,2}[日]?)',
        r'(?<!出生)(?<!年龄)(?:日期|时间)[：:]\s*(\d{4}[-/年.]\s*\d{1,2}[-/月.]\s*\d{1,2}[日]?)',
        r'(\d{4}[-/年.]\s*\d{1,2}[-/月.]\s*\d{1,2}[日]?)\s*(?:就诊|就医|门诊|急诊|住院|出院|入院|检查|检验|体检|手术|复诊|复查|随访)',
    ]
    
    # Exclude patterns - dates near these keywords should be deprioritized
    exclude_patterns = [
        r'(?:出生日期|出生时间|出生年月|生日)[：:]*\s*(\d{4}[-/年.]\s*\d{1,2}[-/月.]\s*\d{1,2}[日]?)',
    ]
    
    # Collect dates to exclude
    excluded_dates = set()
    for pattern in exclude_patterns:
        matches = re.finditer(pattern, text)
        for m in matches:
            date_str = m.group(1) if m.lastindex and m.lastindex >= 1 else m.group(0)
            normalized = normalize_date(date_str)
            if normalized:
                excluded_dates.add(normalized)
    
    all_dates = []
    
    # First extract context-aware dates (higher priority)
    for pattern in context_patterns:
        matches = re.finditer(pattern, text)
        for m in matches:
            date_str = m.group(1) if m.lastindex and m.lastindex >= 1 else m.group(0)
            normalized = normalize_date(date_str)
            if normalized and normalized not in all_dates:
                all_dates.insert(0, normalized)  # Higher priority at front
    
    # Then extract general dates
    for pattern in date_patterns:
        matches = re.finditer(pattern, text)
        for m in matches:
            date_str = m.group(1)
            normalized = normalize_date(date_str)
            if normalized and normalized not in all_dates:
                all_dates.append(normalized)
    
    # Remove excluded dates (e.g. birth dates) and put them at the end
    if excluded_dates:
        priority_dates = [d for d in all_dates if d not in excluded_dates]
        deprioritized = [d for d in all_dates if d in excluded_dates]
        all_dates = priority_dates + deprioritized
    
    # Filter valid dates
    return filter_valid_dates(all_dates)

def normalize_date(date_str: str) -> Optional[str]:
    """Normalize various date formats to YYYY-MM-DD"""
    # Remove whitespace
    s = date_str.strip().replace(' ', '')
    
    # Chinese format: 2024年03月15日
    m = re.match(r'(\d{4})年(\d{1,2})月(\d{1,2})日?', s)
    if m:
        return f"{m.group(1)}-{int(m.group(2)):02d}-{int(m.group(3)):02d}"
    
    # Dot format: 2024.03.15
    m = re.match(r'(\d{4})\.(\d{1,2})\.(\d{1,2})', s)
    if m:
        return f"{m.group(1)}-{int(m.group(2)):02d}-{int(m.group(3)):02d}"
    
    # Slash format: 2024/03/15
    m = re.match(r'(\d{4})/(\d{1,2})/(\d{1,2})', s)
    if m:
        return f"{m.group(1)}-{int(m.group(2)):02d}-{int(m.group(3)):02d}"
    
    # Dash format: 2024-03-15
    m = re.match(r'(\d{4})-(\d{1,2})-(\d{1,2})', s)
    if m:
        return f"{m.group(1)}-{int(m.group(2)):02d}-{int(m.group(3)):02d}"
    
    # 8-digit format: 20240315
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
    max_future = now + timedelta(days=365)  # Allow up to 1 year in future
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
    """Root endpoint"""
    return {"message": "OCR Cloud Service is running", "version": "2.0.0"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": time.time()}

@app.get("/info")
async def service_info():
    """Service information endpoint"""
    import paddleocr as _p
    return {
        "service": "OCR Cloud Service",
        "engine": f"PaddleOCR {getattr(_p, '__version__', 'unknown')}",
        "api_mode": "v3 (PP-OCRv5)" if PADDLEOCR_V3 else "v2 (legacy)",
        "version": "2.0.0",
        "supported_formats": ["jpg", "jpeg", "png", "bmp", "pdf"]
    }

@app.post("/ocr/image")
async def ocr_image(file: UploadFile = File(...)) -> Dict[str, Any]:
    """
    OCR recognition for image files
    
    Args:
        file: Uploaded image file
        
    Returns:
        OCR recognition result with text and metadata
    """
    # Validate file type
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/bmp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file type: {file.content_type}. Allowed types: {allowed_types}"
        )
    
    # Validate file size (10MB limit)
    content = await file.read()
    file_size = len(content)
    
    if file_size > 10 * 1024 * 1024:  # 10MB
        raise HTTPException(
            status_code=400,
            detail="File size exceeds 10MB limit"
        )
    
    try:
        # Start processing timer
        start_time = time.time()
        
        # Convert file to numpy array
        np_arr = np.frombuffer(content, np.uint8)
        image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise HTTPException(
                status_code=400,
                detail="Failed to decode image file"
            )
        
        logger.info(f"Processing image: {file.filename}, size: {file_size} bytes")
        
        # Perform OCR
        texts, confidences = process_image(image)
        full_text = "\n".join(texts)
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
        
        # Extract dates from recognized text
        extracted_dates = extract_dates(full_text)
        
        # Calculate processing time
        processing_time = time.time() - start_time
        
        # Prepare response
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
        
        logger.info(f"OCR completed for {file.filename}, lines: {len(texts)}, time: {processing_time:.2f}s")
        
        return response
        
    except Exception as e:
        logger.error(f"OCR processing failed for {file.filename}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"OCR processing failed: {str(e)}"
        )

@app.post("/ocr/pdf")
async def ocr_pdf(file: UploadFile = File(...)) -> Dict[str, Any]:
    """
    OCR recognition for PDF files
    
    Args:
        file: Uploaded PDF file
        
    Returns:
        OCR recognition result with text and metadata
    """
    # Validate file type
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}. Only PDF files are supported"
        )
    
    # Validate file size (10MB limit)
    content = await file.read()
    file_size = len(content)
    
    if file_size > 10 * 1024 * 1024:  # 10MB
        raise HTTPException(
            status_code=400,
            detail="File size exceeds 10MB limit"
        )
    
    try:
        # Start processing timer
        start_time = time.time()
        
        logger.info(f"Processing PDF: {file.filename}, size: {file_size} bytes")
        
        # Use lower DPI for larger files to protect server memory
        dpi = 100 if file_size > 300 * 1024 else 150
        logger.info(f"Using DPI={dpi} for PDF conversion")

        # Convert PDF to images
        images = convert_pdf_to_images(content, dpi=dpi)

        # Process all pages, release each image after use
        all_texts = []
        all_confidences = []
        for i, image in enumerate(images):
            logger.info(f"Processing page {i+1}/{len(images)}")
            texts, confidences = process_image(image)
            all_texts.extend(texts)
            all_confidences.extend(confidences)
            del image  # Release page memory immediately
        
        full_text = "\n".join(all_texts)
        avg_confidence = sum(all_confidences) / len(all_confidences) if all_confidences else 0.0
        
        # Extract dates from all pages
        extracted_dates = extract_dates(full_text)
        
        # Calculate processing time
        processing_time = time.time() - start_time
        
        # Prepare response
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
        
        logger.info(f"PDF OCR completed for {file.filename}, pages: {len(images)}, lines: {len(all_texts)}, time: {processing_time:.2f}s")
        
        return response
        
    except Exception as e:
        logger.error(f"PDF OCR processing failed for {file.filename}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"PDF OCR processing failed: {str(e)}"
        )

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info",
        timeout_keep_alive=120,
    )
