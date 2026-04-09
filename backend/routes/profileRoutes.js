import { Router } from "express";
import {
  getProfile,
  updateProfile,
  uploadDocuments,
  deleteDocument,
  submitForVerification,
} from "../controllers/profileController.js";
import { auth } from "../middleware/auth.js";
import { uploadProfileFiles } from "../middleware/upload.js";
import validate from "../middleware/validate.js";
import { updateProfileSchema } from "../validators/profileValidators.js";

const router = Router();

router.get("/", auth, getProfile);

router.put(
  "/",
  auth,
  uploadProfileFiles,
  validate(updateProfileSchema),
  updateProfile,
);
router.post("/documents", auth, uploadProfileFiles, uploadDocuments);

router.delete("/documents/:documentId", auth, deleteDocument);
router.post("/submit-verification", auth, submitForVerification);

export default router;
