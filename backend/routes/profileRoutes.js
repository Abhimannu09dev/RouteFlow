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
} = require("../controllers/priceController");

router.get("/", auth, getProfile);
router.put("/", auth, uploadProfileFiles, updateProfile);
router.post("/documents", auth, uploadProfileFiles, uploadDocuments);
router.delete("/documents/:documentId", auth, deleteDocument);
router.post("/submit-verification", auth, submitForVerification);

module.exports = router;
