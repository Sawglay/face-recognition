import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Force JSON body parsing with high base64 limit
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const DATA_DIR = path.join(process.cwd(), "data");
const ENROLLED_FILE = path.join(DATA_DIR, "enrolled.json");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialise enrolled DB if not present
if (!fs.existsSync(ENROLLED_FILE)) {
  fs.writeFileSync(ENROLLED_FILE, JSON.stringify([], null, 2));
}
