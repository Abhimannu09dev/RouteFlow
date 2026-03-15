const User = require("../models/userModel");
const fs = require("fs");
const path = require("path");

const BASE_URL = process.env.BASE_URL || "http://localhost:5000";

function deleteFile(filename) {
  if (!filename) return;
  const filepath = path.join(__dirname, "../uploads", filename);
  if (fs.existsSync(filepath)) {
    fs.unlink(filepath, (err) => {
      if (err) console.error("Failed to delete file:", err.message);
    });
  }
}

async function getProfile(req, res) {
  try {
    const user = await User.findById(req.user.id).select(
      "-password -otpHash -otpExpires -resetTokenHash -resetTokenExpires",
    );

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.status(200).json({ success: true, user });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
}

async function updateProfile(req, res) {
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

    // Handle logo upload
    if (req.files && req.files.companyLogo && req.files.companyLogo[0]) {
      const logoFile = req.files.companyLogo[0];

      // Delete old logo from disk if it exists
      const existingUser = await User.findById(req.user.id).select(
        "companyLogo",
      );
      if (existingUser && existingUser.companyLogo) {
        const oldFilename = path.basename(existingUser.companyLogo);
        deleteFile(oldFilename);
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
    ).select(
      "-password -otpHash -otpExpires -resetTokenHash -resetTokenExpires",
    );

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
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
}

async function uploadDocuments(req, res) {
  try {
    if (
      !req.files ||
      !req.files.documents ||
      req.files.documents.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "No documents uploaded",
      });
    }

    const files = req.files.documents;

    // Parse document types and labels from body
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

    // Validate that types were provided for each file
    if (documentTypes.length !== files.length) {
      return res.status(400).json({
        success: false,
        message: "documentTypes must have one entry per uploaded file",
      });
    }

    const validTypes = [
      "company_registration",
      "tax_clearance",
      "pan_certificate",
      "vat_certificate",
      "other",
    ];

    for (const type of documentTypes) {
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message: `Invalid document type: "${type}". Must be one of: ${validTypes.join(", ")}`,
        });
      }
    }

    // Build new document objects
    const newDocuments = files.map((file, index) => ({
      type: documentTypes[index],
      label: documentLabels[index] || "",
      filename: file.filename,
      url: `${BASE_URL}/uploads/${file.filename}`,
      uploadedAt: new Date(),
    }));

    // Push new documents into user's documents array
    const updated = await User.findByIdAndUpdate(
      req.user.id,
      { $push: { documents: { $each: newDocuments } } },
      { new: true },
    ).select(
      "-password -otpHash -otpExpires -resetTokenHash -resetTokenExpires",
    );

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
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
}

// ── Delete a specific document
async function deleteDocument(req, res) {
  try {
    const { documentId } = req.params;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Find the document in the array
    const document = user.documents.id(documentId);
    if (!document) {
      return res
        .status(404)
        .json({ success: false, message: "Document not found" });
    }

    // Delete the physical file from disk
    deleteFile(document.filename);

    // Remove from the documents array
    user.documents.pull(documentId);
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Document deleted successfully",
      documents: user.documents,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
}

async function submitForVerification(req, res) {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (user.isAccountVerified) {
      return res.status(400).json({
        success: false,
        message: "Your account is already verified",
      });
    }

    if (user.submittedForVerification) {
      return res.status(400).json({
        success: false,
        message:
          "Already submitted for verification. Please wait for admin review.",
      });
    }

    // Require basic text fields
    const requiredFields = ["contactNumber", "panNo", "companyLocation"];
    const missingFields = requiredFields.filter((field) => !user[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Please complete your profile before submitting. Missing: ${missingFields.join(", ")}`,
      });
    }

    // Require at least one document uploaded
    if (!user.documents || user.documents.length === 0) {
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
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
}

module.exports = {
  getProfile,
  updateProfile,
  uploadDocuments,
  deleteDocument,
  submitForVerification,
};
