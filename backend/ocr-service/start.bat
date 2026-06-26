@echo off
REM OCR Service Startup Script for Windows
REM This script starts the FastAPI OCR service

echo Starting OCR Service...

REM Check if Docker is available
docker --version >nul 2>&1
if %errorlevel% == 0 (
    echo Docker found, starting with Docker...
    
    REM Build Docker image
    docker build -t ocr-service .
    
    REM Run Docker container
    docker run -p 8000:8000 --name ocr-service-container ocr-service
    
) else (
    echo Docker not found, starting with Python...
    
    REM Check if virtual environment exists
    if not exist "venv" (
        echo Creating virtual environment...
        python -m venv venv
    )
    
    REM Activate virtual environment
    call venv\Scripts\activate.bat
    
    REM Install dependencies
    echo Installing dependencies...
    pip install -r requirements.txt
    
    REM Start the service
    echo Starting FastAPI service...
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
)

pause
