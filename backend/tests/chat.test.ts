import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";

vi.mock("../models/orderModel.js", () => ({
  default: {
    findById: vi.fn(),
    findForParticipant: vi.fn(),
  },
}));

vi.mock("../models/messageModel.js", () => ({
  default: {
    create: vi.fn(),
    findByOrderId: vi.fn(),
    markRead: vi.fn(),
    countUnread: vi.fn(),
    unreadByOrder: vi.fn(),
  },
}));

vi.mock("../websocket/index.js", () => ({
  getIO: vi.fn(() => ({ to: vi.fn().mockReturnValue({ emit: vi.fn() }) })),
}));

import Order from "../models/orderModel.js";
import Message from "../models/messageModel.js";
import { sendMessage, getUnreadCount } from "../controllers/chatController.js";

const mockRes = () => {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res as unknown as Response;
};

describe("sendMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should derive receiverId from order, ignoring client input", () => {
    const mockOrder = {
      id: 1, status: "accepted",
      manufacturer: { id: 1 }, logistics: { id: 2 },
    };
    vi.mocked(Order.findById).mockReturnValue(mockOrder as never);

    const mockMessage = {
      id: 1, orderId: 1, senderId: 1, receiverId: 2, content: "hello",
      sender: { companyName: "Test Co", email: "test@test.com", role: "manufacturer" },
    };
    vi.mocked(Message.create).mockReturnValue(mockMessage as never);

    const req = {
      user: { id: 1 },
      params: { orderId: "1" },
      body: { receiverId: 999, content: "hello" },
      file: null,
    } as unknown as Request;
    const res = mockRes();

    sendMessage(req, res);

    expect(Message.create).toHaveBeenCalled();
    const savedMessage = vi.mocked(Message.create).mock.calls[0]?.[0];
    expect(savedMessage?.receiverId).toBe(2);
    expect(savedMessage?.receiverId).not.toBe(999);
    expect(vi.mocked(res.status)).toHaveBeenCalledWith(201);
  });

  it("should reject if order is delivered", () => {
    const mockOrder = {
      id: 1, status: "delivered",
      manufacturer: { id: 1 }, logistics: { id: 2 },
    };
    vi.mocked(Order.findById).mockReturnValue(mockOrder as never);

    const req = {
      user: { id: 1 },
      params: { orderId: "1" },
      body: { content: "hi" },
      file: null,
    } as unknown as Request;
    const res = mockRes();

    sendMessage(req, res);

    expect(vi.mocked(res.status)).toHaveBeenCalledWith(403);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  it("should reject if user is not a participant", () => {
    const mockOrder = {
      id: 1, status: "accepted",
      manufacturer: { id: 10 }, logistics: { id: 20 },
    };
    vi.mocked(Order.findById).mockReturnValue(mockOrder as never);

    const req = {
      user: { id: 99 },
      params: { orderId: "1" },
      body: { content: "hi" },
      file: null,
    } as unknown as Request;
    const res = mockRes();

    sendMessage(req, res);

    expect(vi.mocked(res.status)).toHaveBeenCalledWith(403);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });
});

describe("getUnreadCount", () => {
  it("returns unread count", () => {
    vi.mocked(Message.countUnread).mockReturnValue(5);
    const req = { user: { id: 1 } } as unknown as Request;
    const res = mockRes();
    getUnreadCount(req, res);
    expect(vi.mocked(res.json)).toHaveBeenCalledWith(expect.objectContaining({ success: true, count: 5 }));
  });
});
