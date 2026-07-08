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
        
    def load_enrolled_profiles(self):
        """Looks through profiles directory, parses image files, and constructs encoding vectors."""
        if face_recognition is None:
            return

        print("[INFO] Indexing enrolled face profiles registry...")
        for filename in os.listdir(self.database_dir):
            if filename.lower().endswith((".jpg", ".jpeg", ".png")):
                image_path = os.path.join(self.database_dir, filename)
                name = os.path.splitext(filename)[0]
                
                try:
                    # Load image using face_recognition
                    image = face_recognition.load_image_file(image_path)
                    # Extract high-dimensional face feature vectors (128-D)
                    encodings = face_recognition.face_encodings(image)
                    
                    if len(encodings) > 0:
                        self.known_encodings.append(encodings[0])
                        self.known_names.append(name)
                        print(f" -> Enrolled profile identity: {name} [SUCCESS]")
                    else:
                        print(f" -> [FAIL] Could not distinguish any face vectors in {filename}")
                except Exception as e:
                    print(f" -> [ERROR] Failed to compile profile image {filename}: {e}")
        
        print(f"[INFO] Finished indexing. Enrolled profiles count: {len(self.known_names)}")

    def run_live_recognition(self, source_cam_idx=0):
        """Launches live OpenCV camera view, overlaying name recognition tags and landmark contours."""
        if face_recognition is None:
            print("[ERROR] Cannot run camera without face_recognition package installed.")
            return


