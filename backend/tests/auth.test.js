import { describe, it, expect, vi, beforeEach } from "vitest";

//  Mock all external dependencies before importing the controller

vi.mock("../models/userModel.js", () => {
  const User = vi.fn();
  User.findOne = vi.fn();
  return { default: User };
});

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
  },
}));

//  Import after mocks are in place

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

//  Helpers

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.cookie = vi.fn().mockReturnValue(res);
  return res;
};

const mockUser = (overrides = {}) => ({
  _id: "user123",
  companyName: "TestCo",
  email: "test@example.com",
  password: "hashed_password",
  role: "manufacturer",
  isVerified: true,
  isAccountVerified: false,
  otpHash: null,
  otpExpires: null,
  resetTokenHash: null,
  resetTokenExpires: null,
  save: vi.fn(),
  ...overrides,
});

//  createUser

describe("createUser", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test_secret";
    User.findOne.mockResolvedValue(null);
    sendOtpEmail.mockResolvedValue(true);
    // Set up User constructor to return instance with save()
    User.mockImplementation(function () {
      this.save = vi.fn().mockResolvedValue(true);
    });
  });

  it("returns 400 when companyName is missing", async () => {
    const req = { body: { email: "a@b.com", password: "Pass123!" } };
    const res = mockRes();
    await createUser(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Company name is required" }),
    );
  });

  it("returns 400 when email is invalid", async () => {
    const req = {
      body: { companyName: "Co", email: "not-an-email", password: "Pass123!" },
    };
    const res = mockRes();
    await createUser(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Valid email is required" }),
    );
  });

  it("returns 400 when password is too short", async () => {
    const req = {
      body: { companyName: "Co", email: "a@b.com", password: "123" },
    };
    const res = mockRes();
    await createUser(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Password must be at least 6 characters",
      }),
    );
  });

  it("returns 409 when verified user already exists", async () => {
    User.findOne.mockResolvedValue(mockUser({ isVerified: true }));
    const req = {
      body: { companyName: "Co", email: "a@b.com", password: "Pass123!" },
    };
    const res = mockRes();
    await createUser(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "User already exists" }),
    );
  });

  it("resends OTP for unverified existing user and returns 200", async () => {
    const userMock = mockUser({
      isVerified: false,
      otpHash: null,
      otpExpires: null,
    });
    User.findOne.mockResolvedValue(userMock);
    sendOtpEmail.mockResolvedValue(true);

    const req = {
      body: { companyName: "Co", email: "a@b.com", password: "Pass123!" },
    };
    const res = mockRes();
    await createUser(req, res);

    expect(userMock.save).toHaveBeenCalled();
    expect(sendOtpEmail).toHaveBeenCalledWith("a@b.com", expect.any(String));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "OTP resent to email",
      }),
    );
  });

  it("creates a new user, sends OTP, and returns 201", async () => {
    User.findOne.mockResolvedValue(null);
    sendOtpEmail.mockResolvedValue(true);

    const req = {
      body: {
        companyName: "TestCo",
        email: "new@example.com",
        password: "Pass123!",
        role: "manufacturer",
      },
    };
    const res = mockRes();
    await createUser(req, res);

    expect(User).toHaveBeenCalled();
    expect(sendOtpEmail).toHaveBeenCalledWith(
      "new@example.com",
      expect.any(String),
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "User created. OTP sent to email",
      }),
    );
  });

  it("returns 500 when sendOtpEmail fails for new registration", async () => {
    User.findOne.mockResolvedValue(null);
    sendOtpEmail.mockRejectedValue(new Error("SMTP error"));

    const req = {
      body: {
        companyName: "TestCo",
        email: "new@example.com",
        password: "Pass123!",
        role: "manufacturer",
      },
    };
    const res = mockRes();
    await createUser(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining("Failed to send OTP"),
      }),
    );
  });
});

//  loginUser

describe("loginUser", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test_secret";
  });

  it("returns 400 when email is invalid", async () => {
    const req = { body: { email: "bad-email", password: "Pass123!" } };
    const res = mockRes();
    await loginUser(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Valid email is required" }),
    );
  });

  it("returns 400 when password is too short", async () => {
    const req = { body: { email: "a@b.com", password: "123" } };
    const res = mockRes();
    await loginUser(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 401 when email not found", async () => {
    User.findOne.mockResolvedValue(null);
    const req = { body: { email: "a@b.com", password: "Pass123!" } };
    const res = mockRes();
    await loginUser(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Email not found" }),
    );
  });

  it("returns 403 when account is not verified", async () => {
    User.findOne.mockResolvedValue(mockUser({ isVerified: false }));
    const req = { body: { email: "a@b.com", password: "Pass123!" } };
    const res = mockRes();
    await loginUser(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Account not verified" }),
    );
  });

  it("returns 401 when password is incorrect", async () => {
    User.findOne.mockResolvedValue(mockUser({ isVerified: true }));
    bcrypt.compare.mockResolvedValue(false);
    const req = { body: { email: "a@b.com", password: "WrongPass1!" } };
    const res = mockRes();
    await loginUser(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Mismatched password" }),
    );
  });

  it("returns 200 with JWT cookie on successful login", async () => {
    const user = mockUser({ isVerified: true });
    User.findOne.mockResolvedValue(user);
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue("mock.jwt.token");

    const req = { body: { email: "test@example.com", password: "Pass123!" } };
    const res = mockRes();
    await loginUser(req, res);

    expect(res.cookie).toHaveBeenCalledWith(
      "token",
      "mock.jwt.token",
      expect.objectContaining({ httpOnly: true }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Login successful",
        user: expect.objectContaining({ email: "test@example.com" }),
      }),
    );
  });
});

//  verifyOtp

describe("verifyOtp", () => {
  it("returns 400 when email or otp is missing", async () => {
    const req = { body: { email: "a@b.com" } };
    const res = mockRes();
    await verifyOtp(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Email and OTP are required" }),
    );
  });

  it("returns 404 when user not found", async () => {
    User.findOne.mockResolvedValue(null);
    const req = { body: { email: "a@b.com", otp: "123456" } };
    const res = mockRes();
    await verifyOtp(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns 200 when email already verified", async () => {
    User.findOne.mockResolvedValue(mockUser({ isVerified: true }));
    const req = { body: { email: "a@b.com", otp: "123456" } };
    const res = mockRes();
    await verifyOtp(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Email already verified" }),
    );
  });

  it("returns 400 when OTP is expired", async () => {
    User.findOne.mockResolvedValue(
      mockUser({
        isVerified: false,
        otpHash: "somehash",
        otpExpires: new Date(Date.now() - 10000), // expired
      }),
    );
    const req = { body: { email: "a@b.com", otp: "123456" } };
    const res = mockRes();
    await verifyOtp(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "OTP expired" }),
    );
  });

  it("returns 401 on invalid OTP", async () => {
    User.findOne.mockResolvedValue(
      mockUser({
        isVerified: false,
        otpHash: "wrong_hash",
        otpExpires: new Date(Date.now() + 60000),
      }),
    );
    const req = { body: { email: "a@b.com", otp: "000000" } };
    const res = mockRes();
    await verifyOtp(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Invalid OTP" }),
    );
  });

  it("verifies successfully when OTP matches", async () => {
    const crypto = await import("crypto");
    const otp = "123456";
    const otpHash = crypto.default
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    const user = mockUser({
      isVerified: false,
      otpHash,
      otpExpires: new Date(Date.now() + 60000),
    });
    User.findOne.mockResolvedValue(user);

    const req = { body: { email: "a@b.com", otp } };
    const res = mockRes();
    await verifyOtp(req, res);

    expect(user.save).toHaveBeenCalled();
    expect(user.isVerified).toBe(true);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Email verified successfully" }),
    );
  });
});

//  resendOtp

describe("resendOtp", () => {
  it("returns 400 when email is missing", async () => {
    const req = { body: {} };
    const res = mockRes();
    await resendOtp(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 404 when user not found", async () => {
    User.findOne.mockResolvedValue(null);
    const req = { body: { email: "a@b.com" } };
    const res = mockRes();
    await resendOtp(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns 200 when email already verified", async () => {
    User.findOne.mockResolvedValue(mockUser({ isVerified: true }));
    const req = { body: { email: "a@b.com" } };
    const res = mockRes();
    await resendOtp(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Email already verified" }),
    );
  });

  it("resends OTP and returns 200 for unverified user", async () => {
    const user = mockUser({ isVerified: false });
    User.findOne.mockResolvedValue(user);
    sendOtpEmail.mockResolvedValue(true);
    const req = { body: { email: "a@b.com" } };
    const res = mockRes();
    await resendOtp(req, res);
    expect(user.save).toHaveBeenCalled();
    expect(sendOtpEmail).toHaveBeenCalledWith("a@b.com", expect.any(String));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
  });
});

//  forgotPassword

describe("forgotPassword", () => {
  beforeEach(() => {
    process.env.FRONTEND_URL = "http://localhost:3000";
  });

  it("returns 400 for invalid email", async () => {
    const req = { body: { email: "not-an-email" } };
    const res = mockRes();
    await forgotPassword(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 200 even when user not found (security: no enumeration)", async () => {
    User.findOne.mockResolvedValue(null);
    const req = { body: { email: "ghost@test.com" } };
    const res = mockRes();
    await forgotPassword(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("If an account exists"),
      }),
    );
  });

  it("sends reset email and returns 200 for valid user", async () => {
    const user = mockUser();
    User.findOne.mockResolvedValue(user);
    sendEmail.mockResolvedValue(true);
    const req = { body: { email: "test@example.com" } };
    const res = mockRes();
    await forgotPassword(req, res);
    expect(user.save).toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
  });
});

//  resetPassword

describe("resetPassword", () => {
  it("returns 400 when required fields are missing", async () => {
    const req = { body: { password: "NewPass1!" } };
    const res = mockRes();
    await resetPassword(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Token, password, and confirm password are required",
      }),
    );
  });

  it("returns 400 when passwords do not match", async () => {
    const req = {
      body: {
        token: "abc",
        password: "NewPass1!",
        confirmPassword: "Different1!",
      },
    };
    const res = mockRes();
    await resetPassword(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Passwords do not match" }),
    );
  });

  it("returns 400 when password is too short", async () => {
    const req = {
      body: { token: "abc", password: "abc", confirmPassword: "abc" },
    };
    const res = mockRes();
    await resetPassword(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 400 for invalid or expired token", async () => {
    User.findOne.mockResolvedValue(null);
    const req = {
      body: {
        token: "bad_token",
        password: "NewPass1!",
        confirmPassword: "NewPass1!",
      },
    };
    const res = mockRes();
    await resetPassword(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Invalid or expired reset token" }),
    );
  });

  it("resets password successfully with valid token", async () => {
    const user = mockUser();
    User.findOne.mockResolvedValue(user);
    bcrypt.hash.mockResolvedValue("new_hashed_password");
    const req = {
      body: {
        token: "valid_token",
        password: "NewPass1!",
        confirmPassword: "NewPass1!",
      },
    };
    const res = mockRes();
    await resetPassword(req, res);
    expect(bcrypt.hash).toHaveBeenCalledWith("NewPass1!", 10);
    expect(user.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Password reset successfully",
      }),
    );
  });
});
