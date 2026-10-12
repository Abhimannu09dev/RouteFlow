import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";

vi.mock("../models/userModel.js", () => ({
  default: {
    findById: vi.fn(),
    findWithDocuments: vi.fn(),
    update: vi.fn(),
    addDocument: vi.fn(),
    getDocuments: vi.fn(),
    getDocumentById: vi.fn(),
    deleteDocument: vi.fn(),
  },
}));

vi.mock("fs", () => ({ default: { unlink: vi.fn((_p: string, cb: (e: NodeJS.ErrnoException | null) => void) => cb(null)) } }));

import User from "../models/userModel.js";
import {
  getProfile,
  updateProfile,
  uploadDocuments,
  deleteDocument,
  submitForVerification,
} from "../controllers/profileController.js";

const mockRes = () => {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res as unknown as Response;
};

const mockUser = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  companyName: "TestCo",
  email: "test@example.com",
  role: "manufacturer",
  isAccountVerified: false,
  submittedForVerification: false,
  contactNumber: "9800000000",
  panNo: "123456789",
  companyLocation: "Kathmandu",
  companyLogo: null,
  documents: [],
  notificationPreferences: {},
  ...overrides,
});

describe("getProfile", () => {
  it("returns 200 with user data", () => {
    vi.mocked(User.findWithDocuments).mockReturnValue(mockUser() as never);
    const req = { user: { id: 1 } } as unknown as Request;
    const res = mockRes();
    getProfile(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(200);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ success: true, user: expect.any(Object) }));
  });

  it("returns 404 when user not found", () => {
    vi.mocked(User.findWithDocuments).mockReturnValue(null);
    const req = { user: { id: 99 } } as unknown as Request;
    const res = mockRes();
    getProfile(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(404);
  });

  it("returns 500 on model error", () => {
    vi.mocked(User.findWithDocuments).mockImplementation(() => { throw new Error("DB crash"); });
    const req = { user: { id: 1 } } as unknown as Request;
    const res = mockRes();
    getProfile(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(500);
  });
});

describe("updateProfile", () => {
  beforeEach(() => {
    vi.mocked(User.update).mockReturnValue(mockUser({ companyName: "NewCo" }) as never);
    vi.mocked(User.findById).mockReturnValue(mockUser() as never);
  });

  it("updates allowed fields and returns 200", () => {
    const req = { user: { id: 1 }, body: { companyName: "NewCo" }, files: {} } as unknown as Request;
    const res = mockRes();
    updateProfile(req, res);
    expect(User.update).toHaveBeenCalledWith(1, expect.objectContaining({ companyName: "NewCo" }));
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(200);
  });

  it("returns 400 when no valid fields are provided", () => {
    const req = { user: { id: 1 }, body: {}, files: {} } as unknown as Request;
    const res = mockRes();
    updateProfile(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(400);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ message: "No valid fields provided to update" }));
  });

  it("returns 404 when user not found", () => {
    vi.mocked(User.update).mockReturnValue(null);
    const req = { user: { id: 99 }, body: { companyName: "X" }, files: {} } as unknown as Request;
    const res = mockRes();
    updateProfile(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(404);
  });

  it("handles logo upload and deletes old logo", () => {
    vi.mocked(User.findById).mockReturnValue(mockUser({ companyLogo: "http://localhost:5000/uploads/1/old.png" }) as never);
    vi.mocked(User.update).mockReturnValue(mockUser({ companyLogo: "http://localhost:5000/uploads/1/new.png" }) as never);
    const req = {
      user: { id: 1 }, body: {},
      files: { companyLogo: [{ filename: "new.png" }] },
    } as unknown as Request;
    const res = mockRes();
    updateProfile(req, res);
    expect(User.update).toHaveBeenCalledWith(1, expect.objectContaining({ companyLogo: expect.stringContaining("new.png") }));
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(200);
  });
});

describe("uploadDocuments", () => {
  beforeEach(() => {
    vi.mocked(User.getDocuments).mockReturnValue([]);
    vi.mocked(User.addDocument).mockReturnValue(undefined);
  });

  it("returns 400 when no files are uploaded", () => {
    const req = { user: { id: 1 }, body: {}, files: {} } as unknown as Request;
    const res = mockRes();
    uploadDocuments(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(400);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ message: "No documents uploaded" }));
  });

  it("returns 400 for invalid documentTypes JSON", () => {
    const req = {
      user: { id: 1 },
      body: { documentTypes: "not-json", documentLabels: "[]" },
      files: { documents: [{ filename: "file.pdf" }] },
    } as unknown as Request;
    const res = mockRes();
    uploadDocuments(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(400);
  });

  it("returns 400 when documentTypes count mismatches files", () => {
    const req = {
      user: { id: 1 },
      body: { documentTypes: '["pan_certificate","vat_certificate"]', documentLabels: "[]" },
      files: { documents: [{ filename: "file.pdf" }] },
    } as unknown as Request;
    const res = mockRes();
    uploadDocuments(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(400);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ message: "documentTypes must have one entry per uploaded file" }));
  });

  it("returns 400 for invalid document type", () => {
    const req = {
      user: { id: 1 },
      body: { documentTypes: '["unknown_type"]', documentLabels: '["My Doc"]' },
      files: { documents: [{ filename: "file.pdf" }] },
    } as unknown as Request;
    const res = mockRes();
    uploadDocuments(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(400);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining("Invalid document type") }));
  });

  it("uploads documents successfully and returns 200", () => {
    const req = {
      user: { id: 1 },
      body: { documentTypes: '["pan_certificate"]', documentLabels: '["PAN Card"]' },
      files: { documents: [{ filename: "pan.pdf" }] },
    } as unknown as Request;
    const res = mockRes();
    uploadDocuments(req, res);
    expect(User.addDocument).toHaveBeenCalledWith(1, expect.objectContaining({ type: "pan_certificate", label: "PAN Card" }));
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(200);
  });
});

describe("deleteDocument", () => {
  it("returns 404 when document not found", () => {
    vi.mocked(User.getDocumentById).mockReturnValue(null);
    const req = { user: { id: 1 }, params: { documentId: "99" } } as unknown as Request;
    const res = mockRes();
    deleteDocument(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(404);
  });

  it("deletes document and returns 200", () => {
    vi.mocked(User.getDocumentById).mockReturnValue({ id: 5, filename: "doc.pdf" } as never);
    vi.mocked(User.getDocuments).mockReturnValue([]);
    const req = { user: { id: 1 }, params: { documentId: "5" } } as unknown as Request;
    const res = mockRes();
    deleteDocument(req, res);
    expect(User.deleteDocument).toHaveBeenCalledWith(5);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(200);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ success: true, documents: [] }));
  });
});

describe("submitForVerification", () => {
  it("returns 404 when user not found", () => {
    vi.mocked(User.findWithDocuments).mockReturnValue(null);
    const req = { user: { id: 99 } } as unknown as Request;
    const res = mockRes();
    submitForVerification(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(404);
  });

  it("returns 400 when already verified", () => {
    vi.mocked(User.findWithDocuments).mockReturnValue(mockUser({ isAccountVerified: true, documents: [{}] }) as never);
    const req = { user: { id: 1 } } as unknown as Request;
    const res = mockRes();
    submitForVerification(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(400);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ message: "Your account is already verified" }));
  });

  it("returns 400 when already submitted for verification", () => {
    vi.mocked(User.findWithDocuments).mockReturnValue(
      mockUser({ submittedForVerification: true, documents: [{}] }) as never
    );
    const req = { user: { id: 1 } } as unknown as Request;
    const res = mockRes();
    submitForVerification(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(400);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ message: "Already submitted for verification. Please wait for admin review." }));
  });

  it("returns 400 when required profile fields are missing", () => {
    vi.mocked(User.findWithDocuments).mockReturnValue(
      mockUser({ contactNumber: null, panNo: null, companyLocation: null, documents: [{}] }) as never
    );
    const req = { user: { id: 1 } } as unknown as Request;
    const res = mockRes();
    submitForVerification(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(400);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining("Missing:") }));
  });

  it("returns 400 when no documents uploaded", () => {
    vi.mocked(User.findWithDocuments).mockReturnValue(mockUser({ documents: [] }) as never);
    const req = { user: { id: 1 } } as unknown as Request;
    const res = mockRes();
    submitForVerification(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(400);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ message: "Please upload at least one company document before submitting" }));
  });

  it("submits successfully when profile is complete and documents are uploaded", () => {
    vi.mocked(User.findWithDocuments).mockReturnValue(
      mockUser({ documents: [{ id: 1, filename: "doc.pdf" }] }) as never
    );
    vi.mocked(User.update).mockReturnValue(mockUser({ submittedForVerification: true }) as never);
    const req = { user: { id: 1 } } as unknown as Request;
    const res = mockRes();
    submitForVerification(req, res);
    expect(User.update).toHaveBeenCalledWith(1, { submittedForVerification: true });
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(200);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
