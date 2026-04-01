import multer from "multer";
import path from "path";
import fs from "fs";
const uploadDir = path.resolve("uploads");

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// extension mapping (safer than trusting original filename)
const mimeToExt = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.user?.id || "unknown";

    // Optional: create user-specific folder
    const userDir = path.join(uploadDir, userId.toString());

    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    cb(null, userDir);
  },

  filename: (req, file, cb) => {
    const userId = req.user?.id || "unknown";
    const fieldname = file.fieldname;

    const ext = mimeToExt[file.mimetype] || "";
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

    const filename = `${userId}-${fieldname}-${uniqueSuffix}${ext}`;
    cb(null, filename);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = Object.keys(mimeToExt);

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Only images (JPEG, PNG, WebP) and PDF files are allowed"),
      false,
    );
  }
};

// Multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// Multiple fields setup
const uploadProfileFiles = upload.fields([
  { name: "companyLogo", maxCount: 1 },
  { name: "documents", maxCount: 5 },
]);

export { upload, uploadProfileFiles };
