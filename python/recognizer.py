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

        # Boot OpenCV WebRTC video capture helper
        video_capture = cv2.VideoCapture(source_cam_idx)
        if not video_capture.isOpened():
            print(f"[ERROR] Could not gain hardware capture control over camera index: {source_cam_idx}")
            return

        print("\n=======================================================")
        print("CAMERA RIG ONLINE. Press 'q' key in viewer to exit.")
        print("=======================================================\n")

        while True:
            # Grab a single frame from stream
            ret, frame = video_capture.read()
            if not ret:
                print("[ERROR] Lost connection to camera device frame buffer.")
                break

            # Resize frame to speed up math, convert BGR (OpenCV format) to RGB (face_recognition format)
            small_frame = cv2.resize(frame, (0, 0), fx=0.5, fy=0.5)
            rgb_small_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)

            # Find all face boundary coordinates
            face_locations = face_recognition.face_locations(rgb_small_frame)
            face_encodings = face_recognition.face_encodings(rgb_small_frame, face_locations)

            for (top, right, bottom, left), face_encoding in zip(face_locations, face_encodings):
                # Scale coordinate indexes back up to original size
                top *= 2
                right *= 2
                bottom *= 2
                left *= 2

                # Perform high-precision vector matches
                matches = face_recognition.compare_faces(self.known_encodings, face_encoding, tolerance=0.6)
                name = "VISITOR (UNREGISTERED)"
                color = (0, 165, 255) # Yellow/Orange for visitor

                if len(self.known_encodings) > 0:
                    # Calculate vector distance (Euclidean metric) to find closest matching similarity
                    face_distances = face_recognition.face_distance(self.known_encodings, face_encoding)
                    best_match_idx = np.argmin(face_distances)
                    
                    if matches[best_match_idx]:
                        name = self.known_names[best_match_idx].upper()
                        confidence = (1.0 - face_distances[best_match_idx]) * 100
                        name = f"{name} ({confidence:.1f}%)"
                        color = (0, 200, 80) # Cyber Green for Auth Grant

                # Draw bounding box rectangle overlay
                cv2.rectangle(frame, (left, top), (right, bottom), color, 2)

                # Draw decorative visual sights
                line_len = 15
                cv2.line(frame, (left, top), (left + line_len, top), (255, 255, 255), 2)
                cv2.line(frame, (left, top), (left, top + line_len), (255, 255, 255), 2)
                cv2.line(frame, (right, top), (right - line_len, top), (255, 255, 255), 2)
                cv2.line(frame, (right, top), (right, top + line_len), (255, 255, 255), 2)

                # Label background and text
                cv2.rectangle(frame, (left, bottom - 30), (right, bottom), color, cv2.FILLED)
                cv2.putText(frame, name, (left + 6, bottom - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1, cv2.LINE_AA)

            # Display total frame on output window
            cv2.imshow("BIOMTRIC LAB - CAMERA SYSTEM", frame)

            # Hit 'q' on keyboard to close!
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

        # Release resources
        video_capture.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    recognizer = PersonalFaceRecognizer()
    # To run, ensure camera index is active. Pass integer index e.g. 0
    recognizer.run_live_recognition(source_cam_idx=0)



