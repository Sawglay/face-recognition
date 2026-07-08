#!/usr/bin/env python3
"""
Face Recognition & Biometric Analytics - Local Python Module
Uses OpenCV (cv2) and the 'face_recognition' (dlib-powered) framework.

To install dependencies:
    pip install opencv-python face-recognition numpy
"""

import sys
import os
import cv2
import numpy as np

# Try to import face_recognition safely
try:
    import face_recognition
except ImportError:
    print("[WARNING] 'face_recognition' library is not installed locally. Run: pip install face_recognition")
    face_recognition = None


class PersonalFaceRecognizer:
    def __init__(self, database_dir="profiles"):
        self.database_dir = database_dir
        self.known_encodings = []
        self.known_names = []
        
        # Ensure database directory exists
        if not os.path.exists(database_dir):
            os.makedirs(database_dir)
            print(f"[INFO] Created local profile directory: '{database_dir}'")
            
        self.load_enrolled_profiles()
