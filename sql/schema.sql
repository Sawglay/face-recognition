-- Face Biometrics Study Schema
-- Relational Database Architecture for Face Authorization, Identity Roster, and Access Audits.
-- Compatible with PostgreSQL, MySQL, and similar SQL-based relational backends.

-- 1. Create Enrolled Identities Table
CREATE TABLE IF NOT EXISTS enrolled_identitites (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role_classification VARCHAR(100) NOT NULL,
    photo_base64 TEXT NOT NULL, -- Storing primary biometric reference picture
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for speedy identity lookups
CREATE INDEX IF NOT EXISTS idx_identities_name ON enrolled_identitites (name);

-- 2. Create Biometric Log Audits
CREATE TABLE IF NOT EXISTS biometric_scans (
    scan_id SERIAL PRIMARY KEY,
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    matched_id VARCHAR(50) REFERENCES enrolled_identitites(id) ON DELETE SET NULL,
    confidence_score DECIMAL(5,2) NOT NULL, -- Face comparison correlation rating (0.00 to 100.00)
    estimated_age VARCHAR(20),
    estimated_gender VARCHAR(50),
    detected_emotion VARCHAR(50),
    glasses_detected BOOLEAN DEFAULT FALSE,
    facial_hair_classification VARCHAR(100),
    symmetry_score DECIMAL(5,2),
    lighting_efficiency VARCHAR(50),
    head_pose_alignment VARCHAR(100)
);

-- Index values to allow efficient queries for analytics dashboards
CREATE INDEX IF NOT EXISTS idx_scans_matched_id ON biometric_scans (matched_id);
CREATE INDEX IF NOT EXISTS idx_scans_timestamp ON biometric_scans (captured_at);

-- 3. Create Landmark Coordinate Overlay Coordinates table (1:1 with audits)
CREATE TABLE IF NOT EXISTS scan_landmarks (
    scan_id INTEGER PRIMARY KEY REFERENCES biometric_scans(scan_id) ON DELETE CASCADE,
    left_eye_x DECIMAL(5,2) NOT NULL,
    left_eye_y DECIMAL(5,2) NOT NULL,
    right_eye_x DECIMAL(5,2) NOT NULL,
    right_eye_y DECIMAL(5,2) NOT NULL,
    nose_tip_x DECIMAL(5,2) NOT NULL,
    nose_tip_y DECIMAL(5,2) NOT NULL,
    mouth_left_x DECIMAL(5,2) NOT NULL,
    mouth_left_y DECIMAL(5,2) NOT NULL,
    mouth_right_x DECIMAL(5,2) NOT NULL,
    mouth_right_y DECIMAL(5,2) NOT NULL,
    chin_tip_x DECIMAL(5,2) NOT NULL,
    chin_tip_y DECIMAL(5,2) NOT NULL
);
