import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";

vi.mock("../models/userModel.js", () => ({
  default: { findById: vi.fn() },
}));

vi.mock("jsonwebtoken", () => ({
  default: { verify: vi.fn() },
}));

import User from "../models/userModel.js";
import jwt from "jsonwebtoken";
import { auth, rolecheck, requireVerification } from "../middleware/auth.js";
import { parsePagination, buildPaginationMeta } from "../utils/pagination.js";

const mockRes = () => {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res as unknown as Response;
};

const next = vi.fn() as NextFunction;

// ──────────────────── auth middleware ────────────────────

describe("auth middleware", () => {
  beforeEach(() => {
    process.env["JWT_SECRET"] = "test_secret";
  });

  it("returns 401 when no token cookie is present", () => {
    const req = { cookies: {} } as unknown as Request;
    const res = mockRes();
    auth(req, res, next);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(401);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ message: "Unauthorized" }));
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when token is invalid", () => {
    vi.mocked(jwt.verify).mockImplementation(() => { throw new Error("invalid"); });
    const req = { cookies: { token: "bad.token" } } as unknown as Request;
    const res = mockRes();
    auth(req, res, next);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(401);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ message: "Invalid token or expired" }));
  });

  it("returns 403 when user account is deactivated", () => {
    vi.mocked(jwt.verify).mockReturnValue({ id: 1, role: "manufacturer" } as never);
    vi.mocked(User.findById).mockReturnValue({ id: 1, isActive: false, isAccountVerified: false } as never);
    const req = { cookies: { token: "valid.token" } } as unknown as Request;
    const res = mockRes();
    auth(req, res, next);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(403);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ message: "Account deactivated" }));
  });

  it("returns 403 when user not found", () => {
    vi.mocked(jwt.verify).mockReturnValue({ id: 99, role: "manufacturer" } as never);
    vi.mocked(User.findById).mockReturnValue(null);
    const req = { cookies: { token: "valid.token" } } as unknown as Request;
    const res = mockRes();
    auth(req, res, next);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(403);
  });

  it("sets req.user and calls next for valid active user", () => {
    vi.mocked(jwt.verify).mockReturnValue({ id: 1, role: "manufacturer" } as never);
    vi.mocked(User.findById).mockReturnValue({ id: 1, isActive: true, isAccountVerified: true } as never);
    const req = { cookies: { token: "valid.token" } } as unknown as Request;
    const res = mockRes();
    auth(req, res, next);
    expect((req as Request & { user: unknown }).user).toEqual({ id: 1, role: "manufacturer", isAccountVerified: true });
    expect(next).toHaveBeenCalled();
    expect(vi.mocked(res.status)).not.toHaveBeenCalled();
  });
});

// ──────────────────── rolecheck middleware ────────────────────

describe("rolecheck middleware", () => {
  it("returns 403 when user role is not in allowed list", () => {
    const req = { user: { id: 1, role: "logistics" } } as unknown as Request;
    const res = mockRes();
    rolecheck(["manufacturer", "admin"])(req, res, next);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(403);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ message: "Forbidden: Insufficient role" }));
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next when user role is in allowed list", () => {
    const req = { user: { id: 1, role: "manufacturer" } } as unknown as Request;
    const res = mockRes();
    rolecheck(["manufacturer"])(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(vi.mocked(res.status)).not.toHaveBeenCalled();
  });

  it("allows admin when admin is in the role list", () => {
    const req = { user: { id: 1, role: "admin" } } as unknown as Request;
    const res = mockRes();
    rolecheck(["admin"])(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

// ──────────────────── requireVerification middleware ────────────────────

describe("requireVerification middleware", () => {
  it("returns 403 when account is not verified", () => {
    const req = { user: { id: 1, isAccountVerified: false } } as unknown as Request;
    const res = mockRes();
    requireVerification(req, res, next);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(403);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining("verified by admin") }));
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next when account is verified", () => {
    const req = { user: { id: 1, isAccountVerified: true } } as unknown as Request;
    const res = mockRes();
    requireVerification(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

// ──────────────────── pagination utils ────────────────────

describe("parsePagination", () => {
  it("returns defaults when query is empty", () => {
    expect(parsePagination({})).toEqual({ page: 1, limit: 10, skip: 0 });
  });

  it("parses page and limit from query string", () => {
    expect(parsePagination({ page: "3", limit: "20" })).toEqual({ page: 3, limit: 20, skip: 40 });
  });

  it("clamps page to minimum 1 for zero or negative values", () => {
    expect(parsePagination({ page: "0" }).page).toBe(1);
    expect(parsePagination({ page: "-5" }).page).toBe(1);
  });

  it("clamps limit to maximum 100", () => {
    expect(parsePagination({ limit: "200" }).limit).toBe(100);
  });

  it("falls back to default limit of 10 for zero value", () => {
    // parsePagination treats 0 as falsy → falls back to default 10
    expect(parsePagination({ limit: "0" }).limit).toBe(10);
  });

  it("falls back to defaults for non-numeric strings", () => {
    expect(parsePagination({ page: "abc", limit: "xyz" })).toEqual({ page: 1, limit: 10, skip: 0 });
  });

  it("computes correct skip value", () => {
    expect(parsePagination({ page: "4", limit: "15" }).skip).toBe(45);
  });
});

describe("buildPaginationMeta", () => {
  it("returns correct meta for a single page", () => {
    expect(buildPaginationMeta(5, 1, 10)).toEqual({ total: 5, page: 1, limit: 10, totalPages: 1 });
  });

  it("returns correct totalPages when results span multiple pages", () => {
    expect(buildPaginationMeta(25, 2, 10)).toEqual({ total: 25, page: 2, limit: 10, totalPages: 3 });
  });

  it("returns totalPages 0 when total is 0", () => {
    expect(buildPaginationMeta(0, 1, 10)).toEqual({ total: 0, page: 1, limit: 10, totalPages: 0 });
  });

  it("rounds up totalPages for partial last page", () => {
    expect(buildPaginationMeta(11, 1, 10).totalPages).toBe(2);
  });
});
