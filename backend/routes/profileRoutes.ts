import { Router } from "express";
import {
  getProfile,
  updateProfile,
  uploadDocuments,
  deleteDocument,
  submitForVerification,
} from "../controllers/profileController.js";
import { uploadProfileFiles } from "../middleware/upload.js";
import validate from "../middleware/validate.js";
import { updateProfileSchema } from "../validators/profileValidators.js";

const router: ReturnType<typeof Router> = Router();

router.get("/", getProfile);
router.put("/", uploadProfileFiles, validate(updateProfileSchema), updateProfile);
router.post("/documents", uploadProfileFiles, uploadDocuments);
router.delete("/documents/:documentId", deleteDocument);
router.post("/submit-verification", submitForVerification);

export default router;
