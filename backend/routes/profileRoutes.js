const express = require("express");

const router = express.Router();

const { uploadProfileFiles } = require("../middleware/upload");
const { auth } = require("../middleware/auth");

const {
  getProfile,
  updateProfile,
  uploadDocuments,
  deleteDocument,
  submitForVerification,
} = require("../controllers/profileController");

router.get("/profile", auth, getProfile);
router.put("/profile", auth, uploadProfileFiles, updateProfile);
router.post("/profile/documents", auth, uploadProfileFiles, uploadDocuments);
router.delete("/profile/documents/:documentId", auth, deleteDocument);
router.post("/profile/submit-verification", auth, submitForVerification);

module.exports = router;
