# OCR Service

FastAPI-based OCR service for medical document recognition using PaddleOCR.

## 🚀 Quick Start

### Option 1: Docker (Recommended)

```bash
# Build and run with Docker
docker build -t ocr-service .
docker run -p 8000:8000 ocr-service
```

### Option 2: Python

```bash
# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Linux/Mac)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start service
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Option 3: Startup Scripts

```bash
# Linux/Mac
./start.sh

# Windows
start.bat
```

## 📡 API Endpoints

### Health Check
```http
GET /health
```

### Service Info
```http
GET /info
```

### OCR Image Recognition
```http
POST /ocr/image
Content-Type: multipart/form-data

file: [image file]
```

### OCR PDF Recognition
```http
POST /ocr/pdf
Content-Type: multipart/form-data

file: [PDF file]
```

## 🧪 Testing

```bash
# Run test suite
python test.py
```

Or manually test with curl:

```bash
# Health check
curl http://localhost:8000/health

# Service info
curl http://localhost:8000/info

# OCR test (with image file)
curl -X POST -F "file=@test_image.jpg" http://localhost:8000/ocr/image

# PDF OCR test (with PDF file)
curl -X POST -F "file=@test_document.pdf" http://localhost:8000/ocr/pdf
```

## 📋 Supported Formats

- **Images**: JPG, JPEG, PNG, BMP
- **Documents**: PDF
- **File Size**: Maximum 10MB
- **Languages**: Chinese, English

## 🔧 Configuration

The service can be configured by modifying PaddleOCR initialization parameters in `main.py`:

```python
ocr_engine = PaddleOCR(
    use_angle_cls=True,    # Enable angle classification
    lang='ch',             # Language (ch=Chinese)
    use_gpu=False,         # GPU usage
    show_log=False,        # Show logs
    det_db_thresh=0.3,      # Detection threshold
    rec_batch_num=6,       # Batch size
    drop_score=0.5         # Confidence threshold
)
```

## 📊 Response Format

### Image OCR Response
```json
{
    "success": true,
    "filename": "test.jpg",
    "text": "Recognized text content",
    "processing_time": 2.3,
    "line_count": 10,
    "timestamp": 1640000000.0
}
```

### PDF OCR Response
```json
{
    "success": true,
    "filename": "document.pdf",
    "text": "Recognized text content from all pages",
    "processing_time": 5.7,
    "line_count": 25,
    "page_count": 3,
    "timestamp": 1640000000.0
}
```

## 🐳 Docker Details

The Dockerfile includes:
- Python 3.9.19 slim base image
- Required system libraries for OpenCV and PaddleOCR
- All Python dependencies
- Port 8000 exposure

### Key Features
- **Environment Variables**: Set for optimal Python performance
- **System Dependencies**: All required libraries for image processing
- **Multi-stage Build**: Optimized for production

## 🚨 Troubleshooting

### Common Issues

1. **PaddleOCR initialization fails**
   - Ensure sufficient system resources
   - Check internet connection for model download
   - First run may take longer to download models

2. **OpenCV errors**
   - System libraries should be installed via Dockerfile
   - For local Python, install required system packages

3. **PDF processing errors**
   - Ensure `poppler-utils` is installed for PDF processing
   - Check PDF file is not corrupted

4. **Port conflicts**
   - Change port in startup command: `--port 8001`
   - Stop existing containers: `docker stop ocr-service-container`

5. **Memory issues**
   - Reduce `rec_batch_num` in configuration
   - Use smaller images
   - Increase Docker memory limits

### Logs

Enable debug logging:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --log-level debug
```

### Performance Optimization

1. **GPU Support**
   ```python
   ocr_engine = PaddleOCR(use_gpu=True)  # Enable GPU
   ```

2. **Batch Processing**
   ```python
   rec_batch_num=12  # Increase batch size for better performance
   ```

3. **Caching**
   - OCR engine is cached after first initialization
   - Subsequent requests are faster

## 📝 Development

### Project Structure
```
ocr-service/
├── main.py              # FastAPI application
├── requirements.txt     # Python dependencies
├── Dockerfile          # Docker configuration
├── start.sh            # Linux/Mac startup script
├── start.bat           # Windows startup script
├── test.py             # Test suite
└── README.md           # This file
```

### Adding New Features

1. Update `main.py` with new endpoints
2. Add corresponding tests in `test.py`
3. Update this README documentation
4. Rebuild Docker image if needed

### Version Information

- **Python**: 3.9.19
- **FastAPI**: >=0.110.0
- **PaddlePaddle**: >=2.6.2
- **PaddleOCR**: >=2.8.0
- **OpenCV**: >=4.8.1.78

## 📄 License

MIT License
