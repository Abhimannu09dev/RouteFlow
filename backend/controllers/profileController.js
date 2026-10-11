import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import User from "../models/userModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.BASE_URL || "http://localhost:5000";

const VALID_DOCUMENT_TYPES = [
  "company_registration",
  "tax_clearance",
  "pan_certificate",
  "vat_certificate",
  "other",
];

const deleteFile = (filename) => {
  if (!filename) return;
  const filepath = path.join(__dirname, "../uploads", filename);
  fs.unlink(filepath, (err) => {
    if (err && err.code !== "ENOENT") console.error("Failed to delete file:", err.message);
  });
};

const getProfile = (req, res) => {
  try {
    const user = User.findWithDocuments(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    return res.status(200).json({ success: true, user });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

const updateProfile = (req, res) => {
  try {
    const { companyName, contactNumber, panNo, companyLocation, companyDescription, companyWebsite } = req.body;

    const allowedUpdates = {};
    if (companyName) allowedUpdates.companyName = companyName;
    if (contactNumber) allowedUpdates.contactNumber = contactNumber;
    if (panNo) allowedUpdates.panNo = panNo;
    if (companyLocation) allowedUpdates.companyLocation = companyLocation;
    if (companyDescription) allowedUpdates.companyDescription = companyDescription;
    if (companyWebsite) allowedUpdates.companyWebsite = companyWebsite;

    if (req.files?.companyLogo?.[0]) {
      const logoFile = req.files.companyLogo[0];
      const existingUser = User.findById(req.user.id);
      if (existingUser?.companyLogo) deleteFile(path.basename(existingUser.companyLogo));
      allowedUpdates.companyLogo = `${BASE_URL}/uploads/${req.user.id}/${logoFile.filename}`;
    }

    if (Object.keys(allowedUpdates).length === 0) {
      return res.status(400).json({ success: false, message: "No valid fields provided to update" });
    }

    const updated = User.update(req.user.id, allowedUpdates);
    if (!updated) return res.status(404).json({ success: false, message: "User not found" });

    return res.status(200).json({ success: true, message: "Profile updated successfully", user: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

const uploadDocuments = (req, res) => {
  try {
    if (!req.files?.documents?.length) {
      return res.status(400).json({ success: false, message: "No documents uploaded" });
    }

    const files = req.files.documents;
    let documentTypes = [];
    let documentLabels = [];

    try {
      documentTypes = JSON.parse(req.body.documentTypes || "[]");
      documentLabels = JSON.parse(req.body.documentLabels || "[]");
    } catch {
      return res.status(400).json({ success: false, message: "Invalid documentTypes or documentLabels format. Must be JSON arrays." });
    }

    if (documentTypes.length !== files.length) {
      return res.status(400).json({ success: false, message: "documentTypes must have one entry per uploaded file" });
    }

    for (const type of documentTypes) {
      if (!VALID_DOCUMENT_TYPES.includes(type)) {
        return res.status(400).json({ success: false, message: `Invalid document type: "${type}". Must be one of: ${VALID_DOCUMENT_TYPES.join(", ")}` });
      }
    }

    const newDocuments = files.map((file, index) =>
      User.addDocument(req.user.id, {
        type: documentTypes[index],
        label: documentLabels[index] || "",
        filename: file.filename,
        url: `${BASE_URL}/uploads/${req.user.id}/${file.filename}`,
        uploadedAt: new Date().toISOString(),
      })
    );

    const documents = User.getDocuments(req.user.id);

    return res.status(200).json({ success: true, message: `${files.length} document(s) uploaded successfully`, documents });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

const deleteDocument = (req, res) => {
  try {
    const { documentId } = req.params;

    const document = User.getDocumentById(parseInt(documentId, 10));
    if (!document) return res.status(404).json({ success: false, message: "Document not found" });

    deleteFile(document.filename);
    User.deleteDocument(document.id);

    const documents = User.getDocuments(req.user.id);
    return res.status(200).json({ success: true, message: "Document deleted successfully", documents });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

const submitForVerification = (req, res) => {
  try {
    const user = User.findWithDocuments(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (user.isAccountVerified) return res.status(400).json({ success: false, message: "Your account is already verified" });
    if (user.submittedForVerification) {
      return res.status(400).json({ success: false, message: "Already submitted for verification. Please wait for admin review." });
    }

    const requiredFields = ["contactNumber", "panNo", "companyLocation"];
    const missingFields = requiredFields.filter((field) => !user[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({ success: false, message: `Please complete your profile before submitting. Missing: ${missingFields.join(", ")}` });
    }

    if (!user.documents?.length) {
      return res.status(400).json({ success: false, message: "Please upload at least one company document before submitting" });
    }

    User.update(user.id, { submittedForVerification: true });

    return res.status(200).json({ success: true, message: "Profile submitted for verification successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

export { getProfile, updateProfile, uploadDocuments, deleteDocument, submitForVerification };
