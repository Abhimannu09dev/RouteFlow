import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import User from "../models/userModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.BASE_URL || "http://localhost:5000";

const HIDDEN_FIELDS =
  "-password -otpHash -otpExpires -resetTokenHash -resetTokenExpires";

const VALID_DOCUMENT_TYPES = [
  "company_registration",
  "tax_clearance",
  "pan_certificate",
  "vat_certificate",
  "other",
];

// Delete a file from the uploads directory on disk
const deleteFile = (filename) => {
  if (!filename) return;
  const filepath = path.join(__dirname, "../uploads", filename);
  if (fs.existsSync(filepath)) {
    fs.unlink(filepath, (err) => {
      if (err) console.error("Failed to delete file:", err.message);
    });
  }
};

// Get the logged-in user's full profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(HIDDEN_FIELDS);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.status(200).json({ success: true, user });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// Update profile text fields and optionally replace the company logo
const updateProfile = async (req, res) => {
  try {
    const {
      companyName,
      contactNumber,
      panNo,
      companyLocation,
      companyDescription,
      companyWebsite,
    } = req.body;

    const allowedUpdates = {};
    if (companyName) allowedUpdates.companyName = companyName;
    if (contactNumber) allowedUpdates.contactNumber = contactNumber;
    if (panNo) allowedUpdates.panNo = panNo;
    if (companyLocation) allowedUpdates.companyLocation = companyLocation;
    if (companyDescription)
      allowedUpdates.companyDescription = companyDescription;
    if (companyWebsite) allowedUpdates.companyWebsite = companyWebsite;

    if (req.files?.companyLogo?.[0]) {
      const logoFile = req.files.companyLogo[0];

      // Delete old logo from disk
      const existingUser = await User.findById(req.user.id).select(
        "companyLogo",
      );
      if (existingUser?.companyLogo) {
        deleteFile(path.basename(existingUser.companyLogo));
      }

      allowedUpdates.companyLogo = `${BASE_URL}/uploads/${logoFile.filename}`;
    }

    if (Object.keys(allowedUpdates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided to update",
      });
    }

    const updated = await User.findByIdAndUpdate(
      req.user.id,
      { $set: allowedUpdates },
      { new: true, runValidators: true },
    ).select(HIDDEN_FIELDS);

    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updated,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// Upload one or more company documents
const uploadDocuments = async (req, res) => {
  try {
    if (!req.files?.documents?.length) {
      return res
        .status(400)
        .json({ success: false, message: "No documents uploaded" });
    }

    const files = req.files.documents;
    let documentTypes = [];
    let documentLabels = [];

    try {
      documentTypes = JSON.parse(req.body.documentTypes || "[]");
      documentLabels = JSON.parse(req.body.documentLabels || "[]");
    } catch {
      return res.status(400).json({
        success: false,
        message:
          "Invalid documentTypes or documentLabels format. Must be JSON arrays.",
      });
    }

    if (documentTypes.length !== files.length) {
      return res.status(400).json({
        success: false,
        message: "documentTypes must have one entry per uploaded file",
      });
    }

    for (const type of documentTypes) {
      if (!VALID_DOCUMENT_TYPES.includes(type)) {
        return res.status(400).json({
          success: false,
          message: `Invalid document type: "${type}". Must be one of: ${VALID_DOCUMENT_TYPES.join(", ")}`,
        });
      }
    }

    const newDocuments = files.map((file, index) => ({
      type: documentTypes[index],
      label: documentLabels[index] || "",
      filename: file.filename,
      url: `${BASE_URL}/uploads/${file.filename}`,
      uploadedAt: new Date(),
    }));

    const updated = await User.findByIdAndUpdate(
      req.user.id,
      { $push: { documents: { $each: newDocuments } } },
      { new: true },
    ).select(HIDDEN_FIELDS);

    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      message: `${files.length} document(s) uploaded successfully`,
      documents: updated.documents,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// Delete a specific document by its subdocument ID
const deleteDocument = async (req, res) => {
  try {
    const { documentId } = req.params;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const document = user.documents.id(documentId);
    if (!document) {
      return res
        .status(404)
        .json({ success: false, message: "Document not found" });
    }

    deleteFile(document.filename);
    user.documents.pull(documentId);
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Document deleted successfully",
      documents: user.documents,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// Submit profile for admin verification
const submitForVerification = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    if (user.isAccountVerified) {
      return res
        .status(400)
        .json({ success: false, message: "Your account is already verified" });
    }
    if (user.submittedForVerification) {
      return res.status(400).json({
        success: false,
        message:
          "Already submitted for verification. Please wait for admin review.",
      });
    }

    const requiredFields = ["contactNumber", "panNo", "companyLocation"];
    const missingFields = requiredFields.filter((field) => !user[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Please complete your profile before submitting. Missing: ${missingFields.join(", ")}`,
      });
    }

    if (!user.documents?.length) {
      return res.status(400).json({
        success: false,
        message:
          "Please upload at least one company document before submitting",
      });
    }

    user.submittedForVerification = true;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile submitted for verification successfully",
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

export {
  getProfile,
  updateProfile,
  uploadDocuments,
  deleteDocument,
  submitForVerification,
};
