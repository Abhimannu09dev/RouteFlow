import multer from "multer";
import path from "path";
import fs from "fs";
import type { RequestHandler } from "express";
import type { MimeExtension } from "../types/index.js";

const uploadDir = path.resolve("uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const mimeToExt: Record<string, MimeExtension> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const userId = req.user.id.toString();
    const userDir = path.join(uploadDir, userId);
    if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
    cb(null, userDir);
  },

  filename: (req, file, cb) => {
    const userId = req.user.id.toString();
    const ext = mimeToExt[file.mimetype] ?? "";
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${userId}-${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  if (Object.keys(mimeToExt).includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only images (JPEG, PNG, WebP) and PDF files are allowed"));
  }
};

export const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

export const uploadProfileFiles: RequestHandler = upload.fields([
  { name: "companyLogo", maxCount: 1 },
  { name: "documents", maxCount: 5 },
]);
