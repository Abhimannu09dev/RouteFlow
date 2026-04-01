import { Router } from "express";
import {
  getProfile,
  updateProfile,
  uploadDocuments,
  deleteDocument,
  submitForVerification,
} from "../controllers/priceController.js";
import { auth } from "../middleware/auth.js";
import { uploadProfileFiles } from "../middleware/upload.js";

const router = Router();

router.get("/", auth, getProfile);
router.put("/", auth, uploadProfileFiles, updateProfile);
router.post("/documents", auth, uploadProfileFiles, uploadDocuments);
router.delete("/documents/:documentId", auth, deleteDocument);
router.post("/submit-verification", auth, submitForVerification);

export default router;
