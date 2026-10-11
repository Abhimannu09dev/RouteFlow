import { describe, it, expect, vi, beforeEach } from "vitest";

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
    hash: vi.fn(async () => "hashed_password"),
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
import { sendOtpEmail, sendEmail } from "../utils/mailer.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  createUser,
  loginUser,
  verifyOtp,
  resendOtp,
  forgotPassword,
  resetPassword,
} from "../controllers/userController.js";

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.cookie = vi.fn().mockReturnValue(res);
  return res;
};

const mockUser = (overrides = {}) => ({
  id: 1,
  _id: 1,
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

// createUser

describe("createUser", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test_secret";
    User.findByEmail.mockReturnValue(null);
    User.create.mockReturnValue(mockUser());
    User.update.mockReturnValue(mockUser());
    sendOtpEmail.mockResolvedValue(true);
  });

  it("returns 400 when companyName is missing", async () => {
    const req = { body: { email: "a@b.com", password: "Pass123!" } };
    const res = mockRes();
    await createUser(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "Company name is required" }));
  });

  it("returns 400 when email is invalid", async () => {
    const req = { body: { companyName: "Co", email: "not-an-email", password: "Pass123!" } };
    const res = mockRes();
    await createUser(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "Valid email is required" }));
  });

  it("returns 400 when password is too short", async () => {
    const req = { body: { companyName: "Co", email: "a@b.com", password: "123" } };
    const res = mockRes();
    await createUser(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "Password must be at least 6 characters" }));
  });

  it("returns 409 when verified user already exists", async () => {
    User.findByEmail.mockReturnValue(mockUser({ isVerified: true }));
    const req = { body: { companyName: "Co", email: "a@b.com", password: "Pass123!" } };
    const res = mockRes();
    await createUser(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "User already exists" }));
  });

  it("resends OTP for unverified existing user and returns 200", async () => {
    User.findByEmail.mockReturnValue(mockUser({ isVerified: false }));
    sendOtpEmail.mockResolvedValue(true);
    const req = { body: { companyName: "Co", email: "a@b.com", password: "Pass123!" } };
    const res = mockRes();
    await createUser(req, res);
    expect(User.update).toHaveBeenCalled();
    expect(sendOtpEmail).toHaveBeenCalledWith("a@b.com", expect.any(String));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: "OTP resent to email" }));
  });

  it("creates a new user, sends OTP, and returns 201", async () => {
    User.findByEmail.mockReturnValue(null);
    sendOtpEmail.mockResolvedValue(true);
    const req = { body: { companyName: "TestCo", email: "new@example.com", password: "Pass123!", role: "manufacturer" } };
    const res = mockRes();
    await createUser(req, res);
    expect(User.create).toHaveBeenCalled();
    expect(sendOtpEmail).toHaveBeenCalledWith("new@example.com", expect.any(String));
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: "User created. OTP sent to email" }));
  });

  it("returns 500 when sendOtpEmail fails for new registration", async () => {
    User.findByEmail.mockReturnValue(null);
    sendOtpEmail.mockRejectedValue(new Error("SMTP error"));
    const req = { body: { companyName: "TestCo", email: "new@example.com", password: "Pass123!", role: "manufacturer" } };
    const res = mockRes();
    await createUser(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining("Failed to send OTP") }));
  });
});

// loginUser

describe("loginUser", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test_secret";
  });

  it("returns 400 when email is invalid", async () => {
    const req = { body: { email: "bad-email", password: "Pass123!" } };
    const res = mockRes();
    await loginUser(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "Valid email is required" }));
  });

  it("returns 400 when password is too short", async () => {
    const req = { body: { email: "a@b.com", password: "123" } };
    const res = mockRes();
    await loginUser(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 401 when email not found", async () => {
    User.findByEmail.mockReturnValue(null);
    const req = { body: { email: "a@b.com", password: "Pass123!" } };
    const res = mockRes();
    await loginUser(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "Invalid email or password" }));
  });

  it("returns 403 when account is not verified", async () => {
    User.findByEmail.mockReturnValue(mockUser({ isVerified: false }));
    const req = { body: { email: "a@b.com", password: "Pass123!" } };
    const res = mockRes();
    await loginUser(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "Account not verified" }));
  });

  it("returns 401 when password does not match", async () => {
    User.findByEmail.mockReturnValue(mockUser({ isVerified: true }));
    bcrypt.compare.mockResolvedValue(false);
    const req = { body: { email: "a@b.com", password: "WrongPass!" } };
    const res = mockRes();
    await loginUser(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 200 and sets cookie on successful login", async () => {
    User.findByEmail.mockReturnValue(mockUser({ isVerified: true, isActive: true }));
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue("mock.jwt.token");
    const req = { body: { email: "test@example.com", password: "Pass123!" } };
    const res = mockRes();
    await loginUser(req, res);
    expect(res.cookie).toHaveBeenCalledWith("token", "mock.jwt.token", expect.any(Object));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: "Login successful" }));
  });
});

// verifyOtp

describe("verifyOtp", () => {
  it("returns 400 when email or otp is missing", () => {
    const req = { body: { email: "a@b.com" } };
    const res = mockRes();
    verifyOtp(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 404 when user not found", () => {
    User.findByEmail.mockReturnValue(null);
    const req = { body: { email: "a@b.com", otp: "123456" } };
    const res = mockRes();
    verifyOtp(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns 400 when OTP is expired", () => {
    User.findByEmail.mockReturnValue(mockUser({ isVerified: false, otpExpires: new Date(Date.now() - 1000) }));
    const req = { body: { email: "a@b.com", otp: "123456" } };
    const res = mockRes();
    verifyOtp(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "OTP expired" }));
  });
});

// forgotPassword

describe("forgotPassword", () => {
  it("returns 200 even when user not found (security)", async () => {
    User.findByEmail.mockReturnValue(null);
    const req = { body: { email: "a@b.com" } };
    const res = mockRes();
    await forgotPassword(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining("If an account exists") }));
  });
});
