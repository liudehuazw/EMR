#!/bin/bash

# OCR Service Startup Script
# This script starts the FastAPI OCR service

echo "Starting OCR Service..."

# Check if Docker is available
if command -v docker &> /dev/null; then
    echo "Docker found, starting with Docker..."
    
    # Build Docker image
    docker build -t ocr-service .
    
    # Run Docker container
    docker run -p 8000:8000 --name ocr-service-container ocr-service
    
else
    echo "Docker not found, starting with Python..."
    
    # Check if virtual environment exists
    if [ ! -d "venv" ]; then
        echo "Creating virtual environment..."
        python -m venv venv
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Install dependencies
    echo "Installing dependencies..."
    pip install -r requirements.txt
    
    # Start the service
    echo "Starting FastAPI service..."
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
fi
