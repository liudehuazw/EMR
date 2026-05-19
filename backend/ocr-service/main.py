"""
FastAPI OCR Service
PaddleOCR-based service for medical document recognition
PaddleOCR 2.7.3 (PP-OCRv4) — lightweight, 181MB memory
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
import gc

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Log PaddleOCR version
try:
    import paddleocr
    _ver = getattr(paddleocr, '__version__', 'unknown')
    logger.info(f"PaddleOCR version: {_ver}")
except Exception as e:
    logger.warning(f"Could not detect PaddleOCR version: {e}")

# Initialize FastAPI app
app = FastAPI(
    title="OCR Service",
    description="Medical document OCR recognition service (PP-OCRv4)",
    version="2.1.0"
)

# Enable CORS for frontend integration
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
    """Get or create PaddleOCR engine instance (v2.7.3 API)"""
    global ocr_engine
    if ocr_engine is None:
        logger.info("Initializing PaddleOCR 2.7.3 engine...")
        try:
            ocr_engine = PaddleOCR(
                use_angle_cls=False,
                lang='ch',
                use_gpu=False,
                show_log=False,
            )
            logger.info("PaddleOCR 2.7.3 engine initialized (PP-OCRv4)")
        except Exception as e:
            logger.error(f"Failed to initialize PaddleOCR: {e}")
            raise HTTPException(status_code=500, detail="OCR engine initialization failed")
    return ocr_engine

def get_pdf_page_count(pdf_content: bytes) -> int:
    """Get total page count from PDF without converting all pages"""
    try:
        info = pdf2image.pdfinfo_from_bytes(pdf_content)
        return info.get('Pages', 1)
    except Exception:
        return 1

def convert_pdf_page(pdf_content: bytes, page_num: int) -> np.ndarray:
    """Convert a single PDF page to numpy array image (memory-efficient)"""
    try:
        images = pdf2image.convert_from_bytes(
            pdf_content, dpi=150, first_page=page_num, last_page=page_num
        )
        if images:
            img_array = np.array(images[0])
            img_bgr = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
            del images
            gc.collect()
            return img_bgr
        return None
    except Exception as e:
        logger.error(f"Failed to convert PDF page {page_num}: {e}")
        return None

def _extract_from_result(result) -> Tuple[List[str], List[float]]:
    """Extract texts and confidences from PaddleOCR 2.x ocr() result
    
    ocr() returns: [[line1, line2, ...]] where each line = [box, (text, confidence)]
    """
    texts: List[str] = []
    confidences: List[float] = []

    if not result:
        logger.warning("[extract] OCR result is None or empty")
        return texts, confidences

    # result = [[line1, line2, ...]], unwrap first level
    lines = result[0] if result and isinstance(result[0], list) else result

    for idx, line in enumerate(lines):
        try:
            if line is None:
                continue
            # Standard format: [box, (text, confidence)]
            if isinstance(line, (list, tuple)) and len(line) >= 2:
                text_info = line[1]
                if isinstance(text_info, (list, tuple)) and len(text_info) >= 2:
                    text = str(text_info[0])
                    confidence = float(text_info[1])
                    if text.strip() and confidence > 0.3:
                        texts.append(text)
                        confidences.append(confidence)
        except (IndexError, TypeError, ValueError) as e:
            logger.warning(f"[extract] Failed to parse line {idx}: {e}")
            continue

    logger.info(f"[extract] Extracted {len(texts)} texts from {len(lines)} lines")
    return texts, confidences

def _resize_if_needed(image: np.ndarray, max_dim: int = 2048) -> np.ndarray:
    """Resize image if any dimension exceeds max_dim to reduce memory usage"""
    h, w = image.shape[:2]
    if max(h, w) <= max_dim:
        return image
    scale = max_dim / max(h, w)
    new_w, new_h = int(w * scale), int(h * scale)
    logger.info(f"[resize] {w}x{h} -> {new_w}x{new_h} (scale={scale:.2f})")
    resized = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)
    return resized

def _log_memory():
    """Log current process memory usage"""
    try:
        import psutil
        proc = psutil.Process()
        mem = proc.memory_info()
        print(f"[mem] RSS={mem.rss // 1024 // 1024}MB, VMS={mem.vms // 1024 // 1024}MB")
    except ImportError:
        pass

def process_image(image: np.ndarray) -> Tuple[List[str], List[float]]:
    """Process single image with PaddleOCR 2.7.3, returns (texts, confidences)"""
    ocr = get_ocr_engine()
    try:
        # Resize large images to limit peak memory
        image = _resize_if_needed(image)
        result = ocr.ocr(image, cls=False)
        texts, confidences = _extract_from_result(result)
        del result
        gc.collect()
        return texts, confidences
    except Exception as e:
        logger.error(f"OCR processing failed: {e}")
        raise


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
    context_patterns = [
        r'(?:就诊|就医|门诊|急诊|住院|出院|入院|检查|检验|体检|手术|复诊|复查|随访|报告|开具|签发|采样|送检|打印)[日期时间：:]*\s*(\d{4}[-/年.]\s*\d{1,2}[-/月.]\s*\d{1,2}[日]?)',
        r'(?:日期|时间)[：:]\s*(\d{4}[-/年.]\s*\d{1,2}[-/月.]\s*\d{1,2}[日]?)',
        r'(\d{4}[-/年.]\s*\d{1,2}[-/月.]\s*\d{1,2}[日]?)\s*(?:就诊|就医|门诊|急诊|住院|出院|入院|检查|检验|体检|手术|复诊|复查|随访)',
    ]
    
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
    return {"message": "OCR Service is running", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": time.time()}

@app.get("/info")
async def service_info():
    """Service information endpoint"""
    import paddleocr as _p
    return {
        "service": "OCR Service",
        "engine": f"PaddleOCR {getattr(_p, '__version__', 'unknown')}",
        "api_mode": "v2 (PP-OCRv4)",
        "version": "2.1.0",
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
        
        # Free memory aggressively
        del image, np_arr, content, texts, confidences
        gc.collect()
        _log_memory()
        
        logger.info(f"OCR completed for {file.filename}, lines: {response['line_count']}, time: {processing_time:.2f}s")
        
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
        
        # Get page count first
        page_count = get_pdf_page_count(content)
        logger.info(f"PDF has {page_count} page(s)")
        
        # PaddleOCR 2.7.3 is lightweight (~181MB), can handle all pages
        max_pages = min(page_count, 20)
        
        # Process pages one at a time to save memory
        all_texts = []
        all_confidences = []
        for i in range(1, max_pages + 1):
            page_start = time.time()
            print(f"[PDF] Processing page {i}/{max_pages}...")
            image = convert_pdf_page(content, i)
            if image is not None:
                texts, confidences = process_image(image)
                all_texts.extend(texts)
                all_confidences.extend(confidences)
                # Free page image memory immediately
                del image
                gc.collect()
                print(f"[PDF] Page {i} done: {len(texts)} texts, {time.time()-page_start:.1f}s")
        
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
            "page_count": max_pages,
            "timestamp": time.time()
        }
        
        # Free memory aggressively
        del content, all_texts, all_confidences
        gc.collect()
        _log_memory()
        
        logger.info(f"PDF OCR completed for {file.filename}, pages: {max_pages}, lines: {response['line_count']}, time: {processing_time:.2f}s")
        
        return response
        
    except Exception as e:
        logger.error(f"PDF OCR processing failed for {file.filename}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"PDF OCR processing failed: {str(e)}"
        )

@app.on_event("startup")
async def startup_event():
    """Pre-load OCR engine at startup to avoid OOM during first request"""
    logger.info("Pre-loading OCR engine at startup...")
    try:
        get_ocr_engine()
        logger.info("OCR engine pre-loaded successfully")
    except Exception as e:
        logger.error(f"Failed to pre-load OCR engine: {e}")

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
