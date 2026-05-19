"""
Test script for OCR service
This script tests OCR service endpoints
"""

import requests
import json
import os
from typing import Dict, Any

# Service configuration
BASE_URL = "http://localhost:8000"

def test_health_check():
    """Test health check endpoint"""
    print("Testing health check...")
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Health check failed: {e}")
        return False

def test_service_info():
    """Test service info endpoint"""
    print("\nTesting service info...")
    try:
        response = requests.get(f"{BASE_URL}/info")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"Service info test failed: {e}")
        return False

def test_ocr_with_sample_image():
    """Test OCR with a sample image (if available)"""
    print("\nTesting OCR with sample image...")
    
    # Check if we have a test image
    test_image_path = "test_image.jpg"
    if not os.path.exists(test_image_path):
        print("No test image found. Skipping OCR test.")
        print("To test OCR, place a test image named 'test_image.jpg' in the service directory.")
        return True
    
    try:
        with open(test_image_path, 'rb') as f:
            files = {'file': (test_image_path, f, 'image/jpeg')}
            response = requests.post(f"{BASE_URL}/ocr/image", files=files)
        
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"OCR test failed: {e}")
        return False

def test_ocr_with_sample_pdf():
    """Test OCR with a sample PDF (if available)"""
    print("\nTesting OCR with sample PDF...")
    
    # Check if we have a test PDF
    test_pdf_path = "test_document.pdf"
    if not os.path.exists(test_pdf_path):
        print("No test PDF found. Skipping PDF OCR test.")
        print("To test PDF OCR, place a test PDF named 'test_document.pdf' in the service directory.")
        return True
    
    try:
        with open(test_pdf_path, 'rb') as f:
            files = {'file': (test_pdf_path, f, 'application/pdf')}
            response = requests.post(f"{BASE_URL}/ocr/pdf", files=files)
        
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"PDF OCR test failed: {e}")
        return False

def test_file_upload_validation():
    """Test file upload validation"""
    print("\nTesting file upload validation...")
    
    # Test with unsupported file type
    try:
        # Create a dummy text file
        with open("test.txt", "w") as f:
            f.write("This is a test file")
        
        with open("test.txt", 'rb') as f:
            files = {'file': ('test.txt', f, 'text/plain')}
            response = requests.post(f"{BASE_URL}/ocr/image", files=files)
        
        print(f"Unsupported file type - Status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        # Clean up
        os.remove("test.txt")
        
        return response.status_code == 400  # Should return 400 for unsupported file type
    except Exception as e:
        print(f"File validation test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("=== OCR Service Test Suite ===\n")
    
    tests = [
        ("Health Check", test_health_check),
        ("Service Info", test_service_info),
        ("OCR Image Recognition", test_ocr_with_sample_image),
        ("OCR PDF Recognition", test_ocr_with_sample_pdf),
        ("File Upload Validation", test_file_upload_validation),
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"--- {test_name} ---")
        result = test_func()
        results.append((test_name, result))
        print(f"Result: {'PASS' if result else 'FAIL'}\n")
    
    print("=== Test Summary ===")
    for test_name, result in results:
        status = "PASS" if result else "FAIL"
        print(f"{test_name}: {status}")
    
    all_passed = all(result for _, result in results)
    print(f"\nOverall: {'ALL TESTS PASSED' if all_passed else 'SOME TESTS FAILED'}")
    
    return all_passed

if __name__ == "__main__":
    main()
