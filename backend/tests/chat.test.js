import { describe, it, expect, vi, beforeEach } from "vitest";

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
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe("sendMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should derive receiverId from order, ignoring client input", () => {
    const mockOrder = {
      id: 1, _id: 1,
      status: "accepted",
      manufacturer: { id: 1, _id: 1 },
      logistics: { id: 2, _id: 2 },
    };
    Order.findById.mockReturnValue(mockOrder);

    const mockMessage = {
      id: 1, _id: 1,
      orderId: 1,
      senderId: 1,
      receiverId: 2,
      content: "hello",
      sender: { companyName: "Test Co", email: "test@test.com", role: "manufacturer" },
    };
    Message.create.mockReturnValue(mockMessage);

    const req = {
      user: { id: 1 },
      params: { orderId: "1" },
      body: { receiverId: 999, content: "hello" },
      file: null,
    };
    const res = mockRes();

    sendMessage(req, res);

    expect(Message.create).toHaveBeenCalled();
    const savedMessage = Message.create.mock.calls[0][0];
    expect(savedMessage.receiverId).toBe(2);
    expect(savedMessage.receiverId).not.toBe(999);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("should reject if order is delivered", () => {
    const mockOrder = {
      id: 1, _id: 1,
      status: "delivered",
      manufacturer: { id: 1, _id: 1 },
      logistics: { id: 2, _id: 2 },
    };
    Order.findById.mockReturnValue(mockOrder);

    const req = {
      user: { id: 1 },
      params: { orderId: "1" },
      body: { content: "hi" },
      file: null,
    };
    const res = mockRes();

    sendMessage(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  it("should reject if user is not a participant", () => {
    const mockOrder = {
      id: 1, _id: 1,
      status: "accepted",
      manufacturer: { id: 10, _id: 10 },
      logistics: { id: 20, _id: 20 },
    };
    Order.findById.mockReturnValue(mockOrder);

    const req = {
      user: { id: 99 },
      params: { orderId: "1" },
      body: { content: "hi" },
      file: null,
    };
    const res = mockRes();

    sendMessage(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });
});

describe("getUnreadCount", () => {
  it("returns unread count", () => {
    Message.countUnread.mockReturnValue(5);
    const req = { user: { id: 1 } };
    const res = mockRes();
    getUnreadCount(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, count: 5 }));
  });
});
