import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../models/orderModel.js", () => ({
  default: {
    findById: vi.fn(),
  },
}));

vi.mock("../models/messageModel.js", () => ({
  default: {
    create: vi.fn(),
  },
}));

vi.mock("../websocket/index.js", () => ({
  getIO: vi.fn(() => ({ to: vi.fn().mockReturnValue({ emit: vi.fn() }) })),
}));

import Order from "../models/orderModel.js";
import Message from "../models/messageModel.js";
import { sendMessage } from "../controllers/chatController.js";

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

  it("should derive receiverId from order, ignoring client input", async () => {
    const mockOrder = {
      _id: "order1",
      status: "accepted",
      manufacturer: { toString: () => "user1" },
      logistics: { toString: () => "user2" },
    };
    Order.findById.mockResolvedValue(mockOrder);

    const mockMessage = {
      _id: "msg1",
      orderId: "order1",
      senderId: "user1",
      receiverId: "user2",
      content: "hello",
      populate: vi.fn().mockResolvedValue({
        senderId: { companyName: "Test Co", email: "test@test.com", role: "manufacturer" },
      }),
    };
    Message.create.mockResolvedValue(mockMessage);

    const req = {
      user: { id: "user1" },
      params: { orderId: "order1" },
      body: { receiverId: "attacker_id", content: "hello" },
      file: null,
    };
    const res = mockRes();

    await sendMessage(req, res);

    expect(Message.create).toHaveBeenCalled();
    const savedMessage = Message.create.mock.calls[0][0];
    expect(savedMessage.receiverId).toBe("user2");
    expect(savedMessage.receiverId).not.toBe("attacker_id");
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("should reject if order is delivered", async () => {
    const mockOrder = {
      _id: "order1",
      status: "delivered",
      manufacturer: { toString: () => "user1" },
      logistics: { toString: () => "user2" },
    };
    Order.findById.mockResolvedValue(mockOrder);

    const req = {
      user: { id: "user1" },
      params: { orderId: "order1" },
      body: { content: "hello" },
      file: null,
    };
    const res = mockRes();

    await sendMessage(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "This chat is closed because the order has been delivered" }),
    );
  });

  it("should return 400 if unable to determine receiver", async () => {
    const mockOrder = {
      _id: "order1",
      status: "accepted",
      manufacturer: { toString: () => "user1" },
      logistics: null,
    };
    Order.findById.mockResolvedValue(mockOrder);

    const req = {
      user: { id: "user1" },
      params: { orderId: "order1" },
      body: { content: "hello" },
      file: null,
    };
    const res = mockRes();

    await sendMessage(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Unable to determine receiver" }),
    );
  });
});