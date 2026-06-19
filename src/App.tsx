import React, { useState, useEffect, useRef } from "react";
import { 
  Camera, 
  UserCheck, 
  UserPlus, 
  Trash2, 
  RefreshCw, 
  Scan, 
  Activity, 
  Sparkles, 
  ShieldCheck, 
  ShieldAlert, 
  HelpCircle, 
  Info,
  Terminal,
  Clock,
  Eye,
  Database,
  Upload,
  UserX,
  AlertTriangle
} from "lucide-react";

// Types corresponding to backend/Gemini payloads
interface LandmarkPoint {
  x: number;
  y: number;
}

interface BoundingBox {
  xMin: number;
  yMin: number;
  width: number;
  height: number;
}

interface Landmarks {
  leftEye: LandmarkPoint;
  rightEye: LandmarkPoint;
  noseTip: LandmarkPoint;
  mouthLeft: LandmarkPoint;
  mouthRight: LandmarkPoint;
  chinTip: LandmarkPoint;
  faceOutline: LandmarkPoint[];
}

interface Biometrics {
  estimatedAge: string;
  estimatedGender: string;
  emotion: string;
  glassesDetected: boolean;
  facialHair: string;
  symmetryScore: number;
  boundingBox: BoundingBox;
  landmarks: Landmarks;
  technicalReport: {
    focusQuality: string;
    lightingConditions: string;
    headPose: string;
  };
}


interface GeminiAnalysisResult {
  matchedId: string | null;
  matchedName: string | null;
  matchConfidence: number;
  matchReason: string;
  biometrics: Biometrics;
}

interface EnrolledUser {
  id: string;
  name: string;
  role: string;
  photoData: string;
  enrolledAt: string;
}

export default function App() {
  // Database State
  const [enrolledUsers, setEnrolledUsers] = useState<EnrolledUser[]>([]);
  const [isLoadingDB, setIsLoadingDB] = useState(false);

  // Active Scan/Capture State
  const [streamActive, setStreamActive] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<GeminiAnalysisResult | null>(null);

  // Enrollment Form State
  const [enrollName, setEnrollName] = useState("");
  const [enrollRole, setEnrollRole] = useState("Employee");
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollMessage, setEnrollMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Clock state for high-tech aesthetic
  const [currentTime, setCurrentTime] = useState("");

  // Refs for WebRTC Video
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
