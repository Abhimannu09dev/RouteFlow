import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";

vi.mock("../models/userModel.js", () => ({
  default: {
    findByEmail: vi.fn(),
    findByResetToken: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("../utils/mailer.js", () => ({
  sendOtpEmail: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock("bcrypt", () => ({
  default: {
    hash: vi.fn(() => "hashed_password"),
    compare: vi.fn(),
  },
}));

vi.mock("jsonwebtoken", () => ({
  default: {
    sign: vi.fn(() => "mock.jwt.token"),
    verify: vi.fn(),
  },
}));

import User from "../models/userModel.js";
import { sendOtpEmail } from "../utils/mailer.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  createUser,
  loginUser,
  verifyOtp,
  forgotPassword,
} from "../controllers/userController.js";

const mockRes = () => {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
    cookie: vi.fn(),
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  res.cookie.mockReturnValue(res);
  return res as unknown as Response;
};

const mockUser = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  companyName: "TestCo",
  email: "test@example.com",
  password: "hashed_password",
  role: "manufacturer",
  isVerified: true,
  isActive: true,
  isAccountVerified: false,
  otpHash: null,
  otpExpires: null,
  resetTokenHash: null,
  resetTokenExpires: null,
  ...overrides,
});

const UserMock = vi.mocked(User);
const sendOtpEmailMock = vi.mocked(sendOtpEmail);
const bcryptMock = vi.mocked(bcrypt);
const jwtMock = vi.mocked(jwt);

describe("createUser", () => {
  beforeEach(() => {
    process.env["JWT_SECRET"] = "test_secret";
    UserMock.findByEmail.mockReturnValue(null);
    UserMock.create.mockReturnValue(mockUser() as never);
    UserMock.update.mockReturnValue(mockUser() as never);
    sendOtpEmailMock.mockResolvedValue(true);
  });

  it("returns 400 when companyName is missing", async () => {
    const req = { body: { email: "a@b.com", password: "Pass123!" } } as Request;
    const res = mockRes();
    await createUser(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(400);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ error: "Company name is required" }));
  });

  it("returns 400 when email is invalid", async () => {
    const req = { body: { companyName: "Co", email: "not-an-email", password: "Pass123!" } } as Request;
    const res = mockRes();
    await createUser(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(400);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ error: "Valid email is required" }));
  });

  it("returns 400 when password is too short", async () => {
    const req = { body: { companyName: "Co", email: "a@b.com", password: "123" } } as Request;
    const res = mockRes();
    await createUser(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(400);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ error: "Password must be at least 6 characters" }));
  });

  it("returns 409 when verified user already exists", async () => {
    UserMock.findByEmail.mockReturnValue(mockUser({ isVerified: true }) as never);
    const req = { body: { companyName: "Co", email: "a@b.com", password: "Pass123!" } } as Request;
    const res = mockRes();
    await createUser(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(409);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ error: "User already exists" }));
  });

  it("resends OTP for unverified existing user and returns 200", async () => {
    UserMock.findByEmail.mockReturnValue(mockUser({ isVerified: false }) as never);
    sendOtpEmailMock.mockResolvedValue(true);
    const req = { body: { companyName: "Co", email: "a@b.com", password: "Pass123!" } } as Request;
    const res = mockRes();
    await createUser(req, res);
    expect(UserMock.update).toHaveBeenCalled();
    expect(sendOtpEmailMock).toHaveBeenCalledWith("a@b.com", expect.any(String));
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(200);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: "OTP resent to email" }));
  });

  it("creates a new user, sends OTP, and returns 201", async () => {
    UserMock.findByEmail.mockReturnValue(null);
    sendOtpEmailMock.mockResolvedValue(true);
    const req = { body: { companyName: "TestCo", email: "new@example.com", password: "Pass123!", role: "manufacturer" } } as Request;
    const res = mockRes();
    await createUser(req, res);
    expect(UserMock.create).toHaveBeenCalled();
    expect(sendOtpEmailMock).toHaveBeenCalledWith("new@example.com", expect.any(String));
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(201);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: "User created. OTP sent to email" }));
  });

  it("returns 500 when sendOtpEmail fails for new registration", async () => {
    UserMock.findByEmail.mockReturnValue(null);
    sendOtpEmailMock.mockRejectedValue(new Error("SMTP error"));
    const req = { body: { companyName: "TestCo", email: "new@example.com", password: "Pass123!", role: "manufacturer" } } as Request;
    const res = mockRes();
    await createUser(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(500);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining("Failed to send OTP") }));
  });
});

describe("loginUser", () => {
  beforeEach(() => {
    process.env["JWT_SECRET"] = "test_secret";
  });

  it("returns 400 when email is invalid", async () => {
    const req = { body: { email: "bad-email", password: "Pass123!" } } as Request;
    const res = mockRes();
    await loginUser(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(400);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ error: "Valid email is required" }));
  });

  it("returns 400 when password is too short", async () => {
    const req = { body: { email: "a@b.com", password: "123" } } as Request;
    const res = mockRes();
    await loginUser(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(400);
  });

  it("returns 401 when email not found", async () => {
    UserMock.findByEmail.mockReturnValue(null);
    const req = { body: { email: "a@b.com", password: "Pass123!" } } as Request;
    const res = mockRes();
    await loginUser(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(401);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ error: "Invalid email or password" }));
  });

  it("returns 403 when account is not verified", async () => {
    UserMock.findByEmail.mockReturnValue(mockUser({ isVerified: false }) as never);
    const req = { body: { email: "a@b.com", password: "Pass123!" } } as Request;
    const res = mockRes();
    await loginUser(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(403);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ error: "Account not verified" }));
  });

  it("returns 401 when password does not match", async () => {
    UserMock.findByEmail.mockReturnValue(mockUser({ isVerified: true }) as never);
    bcryptMock.compare.mockResolvedValue(false as never);
    const req = { body: { email: "a@b.com", password: "WrongPass!" } } as Request;
    const res = mockRes();
    await loginUser(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(401);
  });

  it("returns 200 and sets cookie on successful login", async () => {
    UserMock.findByEmail.mockReturnValue(mockUser({ isVerified: true, isActive: true }) as never);
    bcryptMock.compare.mockResolvedValue(true as never);
    jwtMock.sign.mockReturnValue("mock.jwt.token" as never);
    const req = { body: { email: "test@example.com", password: "Pass123!" } } as Request;
    const res = mockRes();
    await loginUser(req, res);
    expect(vi.mocked(res.cookie)).toHaveBeenCalledWith("token", "mock.jwt.token", expect.any(Object));
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(200);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: "Login successful" }));
  });
});

describe("verifyOtp", () => {
  it("returns 400 when email or otp is missing", () => {
    const req = { body: { email: "a@b.com" } } as Request;
    const res = mockRes();
    verifyOtp(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(400);
  });

  it("returns 404 when user not found", () => {
    UserMock.findByEmail.mockReturnValue(null);
    const req = { body: { email: "a@b.com", otp: "123456" } } as Request;
    const res = mockRes();
    verifyOtp(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(404);
  });

  it("returns 400 when OTP is expired", () => {
    UserMock.findByEmail.mockReturnValue(mockUser({ isVerified: false, otpExpires: new Date(Date.now() - 1000).toISOString() }) as never);
    const req = { body: { email: "a@b.com", otp: "123456" } } as Request;
    const res = mockRes();
    verifyOtp(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(400);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ error: "OTP expired" }));
  });
});

describe("forgotPassword", () => {
  it("returns 200 even when user not found (security)", async () => {
    UserMock.findByEmail.mockReturnValue(null);
    const req = { body: { email: "a@b.com" } } as Request;
    const res = mockRes();
    await forgotPassword(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(200);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining("If an account exists") }));
  });
});
