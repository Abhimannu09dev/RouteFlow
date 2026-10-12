import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";

vi.mock("../models/userModel.js", () => ({
  default: {
    findById: vi.fn(),
    findByIdWithPassword: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("bcrypt", () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(() => "new_hashed_password"),
  },
}));

import User from "../models/userModel.js";
import bcrypt from "bcrypt";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  changePassword,
  deactivateAccount,
} from "../controllers/settingsController.js";

const mockRes = () => {
  const res = { status: vi.fn(), json: vi.fn(), clearCookie: vi.fn() };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  res.clearCookie.mockReturnValue(res);
  return res as unknown as Response;
};

const mockUser = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  email: "test@example.com",
  password: "hashed_password",
  notificationPreferences: {
    emailNotifications: true,
    orderStatusUpdates: true,
    bidUpdates: true,
    newOrderAlerts: false,
    chatMessages: true,
  },
  ...overrides,
});

describe("getNotificationPreferences", () => {
  it("returns 200 with preferences", () => {
    vi.mocked(User.findById).mockReturnValue(mockUser() as never);
    const req = { user: { id: 1 } } as unknown as Request;
    const res = mockRes();
    getNotificationPreferences(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(200);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ success: true, preferences: expect.any(Object) }));
  });

  it("returns 404 when user not found", () => {
    vi.mocked(User.findById).mockReturnValue(null);
    const req = { user: { id: 99 } } as unknown as Request;
    const res = mockRes();
    getNotificationPreferences(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(404);
  });

  it("returns 500 on error", () => {
    vi.mocked(User.findById).mockImplementation(() => { throw new Error("DB error"); });
    const req = { user: { id: 1 } } as unknown as Request;
    const res = mockRes();
    getNotificationPreferences(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(500);
  });
});

describe("updateNotificationPreferences", () => {
  beforeEach(() => {
    vi.mocked(User.update).mockReturnValue(mockUser() as never);
  });

  it("updates boolean preference keys and returns 200", () => {
    const req = { user: { id: 1 }, body: { emailNotifications: false } } as unknown as Request;
    const res = mockRes();
    updateNotificationPreferences(req, res);
    expect(User.update).toHaveBeenCalledWith(1, { "notificationPreferences.emailNotifications": false });
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(200);
  });

  it("ignores non-boolean values and non-preference keys", () => {
    const req = { user: { id: 1 }, body: { emailNotifications: "yes", unknownKey: true } } as unknown as Request;
    const res = mockRes();
    updateNotificationPreferences(req, res);
    expect(User.update).toHaveBeenCalledWith(1, {});
  });

  it("returns 404 when user not found", () => {
    vi.mocked(User.update).mockReturnValue(null);
    const req = { user: { id: 99 }, body: { chatMessages: false } } as unknown as Request;
    const res = mockRes();
    updateNotificationPreferences(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(404);
  });
});

describe("changePassword", () => {
  beforeEach(() => {
    vi.mocked(User.findByIdWithPassword).mockReturnValue(mockUser() as never);
    vi.mocked(User.update).mockReturnValue(mockUser() as never);
  });

  it("returns 404 when user not found", async () => {
    vi.mocked(User.findByIdWithPassword).mockReturnValue(null);
    const req = { user: { id: 99 }, body: { currentPassword: "old", newPassword: "newPass1!" } } as unknown as Request;
    const res = mockRes();
    await changePassword(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(404);
  });

  it("returns 400 when current password is incorrect", async () => {
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);
    const req = { user: { id: 1 }, body: { currentPassword: "wrong", newPassword: "newPass1!" } } as unknown as Request;
    const res = mockRes();
    await changePassword(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(400);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ message: "Current password is incorrect" }));
  });

  it("changes password and returns 200", async () => {
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    vi.mocked(bcrypt.hash).mockResolvedValue("new_hashed_password" as never);
    const req = { user: { id: 1 }, body: { currentPassword: "oldPass1!", newPassword: "newPass1!" } } as unknown as Request;
    const res = mockRes();
    await changePassword(req, res);
    expect(User.update).toHaveBeenCalledWith(1, { password: "new_hashed_password" });
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(200);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ message: "Password changed successfully" }));
  });
});

describe("deactivateAccount", () => {
  beforeEach(() => {
    vi.mocked(User.findByIdWithPassword).mockReturnValue(mockUser() as never);
    vi.mocked(User.update).mockReturnValue(mockUser({ isActive: false }) as never);
  });

  it("returns 404 when user not found", async () => {
    vi.mocked(User.findByIdWithPassword).mockReturnValue(null);
    const req = { user: { id: 99 }, body: { password: "pass" } } as unknown as Request;
    const res = mockRes();
    await deactivateAccount(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(404);
  });

  it("returns 400 when password is incorrect", async () => {
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);
    const req = { user: { id: 1 }, body: { password: "wrongPass" } } as unknown as Request;
    const res = mockRes();
    await deactivateAccount(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(400);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ message: "Incorrect password" }));
  });

  it("deactivates account, clears cookie, and returns 200", async () => {
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    const req = { user: { id: 1 }, body: { password: "correctPass" } } as unknown as Request;
    const res = mockRes();
    await deactivateAccount(req, res);
    expect(User.update).toHaveBeenCalledWith(1, { isActive: false });
    expect(vi.mocked(res.clearCookie)).toHaveBeenCalledWith("token", expect.any(Object));
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(200);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ message: "Account deactivated successfully" }));
  });
});
