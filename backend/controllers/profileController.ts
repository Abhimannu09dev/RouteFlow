import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { Request, Response } from "express";
import User from "../models/userModel.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env["BASE_URL"] ?? "http://localhost:5000";

const VALID_DOCUMENT_TYPES = [
  "company_registration",
  "tax_clearance",
  "pan_certificate",
  "vat_certificate",
  "other",
] as const;

type ValidDocType = (typeof VALID_DOCUMENT_TYPES)[number];

function deleteFile(filename: string): void {
  if (!filename) return;
  const filepath = path.join(__dirname, "../uploads", filename);
  fs.unlink(filepath, (err) => {
    if (err && (err).code !== "ENOENT") {
      console.error("Failed to delete file:", err.message);
    }
  });
}

export const getProfile = (req: Request, res: Response): void => {
  try {
    const user = User.findWithDocuments(req.user.id);
    if (!user) { res.status(404).json({ success: false, message: "User not found" }); return; }
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error instanceof Error ? error.message : String(error) });
  }
};

export const updateProfile = (req: Request, res: Response): void => {
  try {
    const {
      companyName, contactNumber, panNo, companyLocation, companyDescription, companyWebsite,
    } = req.body as Record<string, string | undefined>;

    const allowedUpdates: Record<string, unknown> = {};
    if (companyName) allowedUpdates["companyName"] = companyName;
    if (contactNumber) allowedUpdates["contactNumber"] = contactNumber;
    if (panNo) allowedUpdates["panNo"] = panNo;
    if (companyLocation) allowedUpdates["companyLocation"] = companyLocation;
    if (companyDescription) allowedUpdates["companyDescription"] = companyDescription;
    if (companyWebsite) allowedUpdates["companyWebsite"] = companyWebsite;

    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    const logoFile = files?.["companyLogo"]?.[0];
    if (logoFile) {
      const existingUser = User.findById(req.user.id);
      if (existingUser?.companyLogo) deleteFile(path.basename(existingUser.companyLogo));
      allowedUpdates["companyLogo"] = `${BASE_URL}/uploads/${req.user.id}/${logoFile.filename}`;
    }

    if (Object.keys(allowedUpdates).length === 0) {
      res.status(400).json({ success: false, message: "No valid fields provided to update" });
      return;
    }

    const updated = User.update(req.user.id, allowedUpdates);
    if (!updated) { res.status(404).json({ success: false, message: "User not found" }); return; }

    res.status(200).json({ success: true, message: "Profile updated successfully", user: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error instanceof Error ? error.message : String(error) });
  }
};

export const uploadDocuments = (req: Request, res: Response): void => {
  try {
    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    const docFiles = files?.["documents"];

    if (!docFiles?.length) {
      res.status(400).json({ success: false, message: "No documents uploaded" });
      return;
    }

    let documentTypes: string[] = [];
    let documentLabels: string[] = [];

    try {
      documentTypes = JSON.parse((req.body as Record<string, string>)["documentTypes"] ?? "[]") as string[];
      documentLabels = JSON.parse((req.body as Record<string, string>)["documentLabels"] ?? "[]") as string[];
    } catch {
      res.status(400).json({ success: false, message: "Invalid documentTypes or documentLabels format. Must be JSON arrays." });
      return;
    }

    if (documentTypes.length !== docFiles.length) {
      res.status(400).json({ success: false, message: "documentTypes must have one entry per uploaded file" });
      return;
    }

    for (const type of documentTypes) {
      if (!VALID_DOCUMENT_TYPES.includes(type as ValidDocType)) {
        res.status(400).json({ success: false, message: `Invalid document type: "${type}". Must be one of: ${VALID_DOCUMENT_TYPES.join(", ")}` });
        return;
      }
    }

    docFiles.forEach((file, index) => {
      User.addDocument(req.user.id, {
        type: documentTypes[index] as string,
        label: documentLabels[index] ?? "",
        filename: file.filename,
        url: `${BASE_URL}/uploads/${req.user.id}/${file.filename}`,
        uploadedAt: new Date().toISOString(),
      });
    });

    const documents = User.getDocuments(req.user.id);
    res.status(200).json({ success: true, message: `${docFiles.length} document(s) uploaded successfully`, documents });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error instanceof Error ? error.message : String(error) });
  }
};

export const deleteDocument = (req: Request, res: Response): void => {
  try {
    const { documentId } = req.params as { documentId: string };

    const document = User.getDocumentById(parseInt(documentId, 10));
    if (!document) { res.status(404).json({ success: false, message: "Document not found" }); return; }

    deleteFile(document.filename);
    User.deleteDocument(document.id);

    const documents = User.getDocuments(req.user.id);
    res.status(200).json({ success: true, message: "Document deleted successfully", documents });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error instanceof Error ? error.message : String(error) });
  }
};

export const submitForVerification = (req: Request, res: Response): void => {
  try {
    const user = User.findWithDocuments(req.user.id);
    if (!user) { res.status(404).json({ success: false, message: "User not found" }); return; }
    if (user.isAccountVerified) {
      res.status(400).json({ success: false, message: "Your account is already verified" });
      return;
    }
    if (user.submittedForVerification) {
      res.status(400).json({ success: false, message: "Already submitted for verification. Please wait for admin review." });
      return;
    }

    const requiredFields = ["contactNumber", "panNo", "companyLocation"] as const;
    const missingFields = requiredFields.filter((field) => !user[field]);
    if (missingFields.length > 0) {
      res.status(400).json({ success: false, message: `Please complete your profile before submitting. Missing: ${missingFields.join(", ")}` });
      return;
    }

    if (!user.documents.length) {
      res.status(400).json({ success: false, message: "Please upload at least one company document before submitting" });
      return;
    }

    User.update(user.id, { submittedForVerification: true });
    res.status(200).json({ success: true, message: "Profile submitted for verification successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error instanceof Error ? error.message : String(error) });
  }
};
