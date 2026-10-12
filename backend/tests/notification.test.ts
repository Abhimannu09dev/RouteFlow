import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";

vi.mock("../models/notificationModel.js", () => ({
  default: {
    find: vi.fn(),
    countUnread: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  },
}));

import Notification from "../models/notificationModel.js";
import { getNotifications, markAsRead, markAllAsRead } from "../controllers/notificationController.js";

const mockRes = () => {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res as unknown as Response;
};

const mockNotification = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  recipientId: 1,
  message: "Your order was accepted",
  isRead: false,
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe("getNotifications", () => {
  beforeEach(() => {
    vi.mocked(Notification.find).mockReturnValue([mockNotification()] as never);
    vi.mocked(Notification.countUnread).mockReturnValue(1);
  });

  it("returns 200 with notifications and unread count", () => {
    const req = { user: { id: 1 } } as unknown as Request;
    const res = mockRes();
    getNotifications(req, res);
    expect(Notification.find).toHaveBeenCalledWith({ recipientId: 1 });
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(200);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, notifications: expect.any(Array), unreadCount: 1 })
    );
  });

  it("returns empty array when no notifications exist", () => {
    vi.mocked(Notification.find).mockReturnValue([] as never);
    vi.mocked(Notification.countUnread).mockReturnValue(0);
    const req = { user: { id: 1 } } as unknown as Request;
    const res = mockRes();
    getNotifications(req, res);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ notifications: [], unreadCount: 0 }));
  });

  it("returns 500 on model error", () => {
    vi.mocked(Notification.find).mockImplementation(() => { throw new Error("DB error"); });
    const req = { user: { id: 1 } } as unknown as Request;
    const res = mockRes();
    getNotifications(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(500);
  });
});

describe("markAsRead", () => {
  it("marks notification as read and returns 200", () => {
    vi.mocked(Notification.markRead).mockReturnValue(undefined);
    const req = { user: { id: 1 }, params: { notificationId: "5" } } as unknown as Request;
    const res = mockRes();
    markAsRead(req, res);
    expect(Notification.markRead).toHaveBeenCalledWith(5, 1);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(200);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it("returns 500 on model error", () => {
    vi.mocked(Notification.markRead).mockImplementation(() => { throw new Error("DB error"); });
    const req = { user: { id: 1 }, params: { notificationId: "5" } } as unknown as Request;
    const res = mockRes();
    markAsRead(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(500);
  });
});

describe("markAllAsRead", () => {
  it("marks all notifications as read and returns 200", () => {
    vi.mocked(Notification.markAllRead).mockReturnValue(undefined);
    const req = { user: { id: 1 } } as unknown as Request;
    const res = mockRes();
    markAllAsRead(req, res);
    expect(Notification.markAllRead).toHaveBeenCalledWith(1);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(200);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: "All marked as read" }));
  });

  it("returns 500 on model error", () => {
    vi.mocked(Notification.markAllRead).mockImplementation(() => { throw new Error("DB error"); });
    const req = { user: { id: 1 } } as unknown as Request;
    const res = mockRes();
    markAllAsRead(req, res);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(500);
  });
});
