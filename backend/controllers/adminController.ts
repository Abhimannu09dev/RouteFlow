import type { Request, Response } from "express";
import User from "../models/userModel.js";
import Order from "../models/orderModel.js";
import { parsePagination, buildPaginationMeta } from "../utils/pagination.js";
type UserFilter = Parameters<typeof User.findAll>[0];

export const getAdminStats = (req: Request, res: Response): void => {
  try {
    const totalUsers = User.count({ roleNe: "admin" });
    const pendingVerification = User.count({ submittedForVerification: true, isAccountVerified: false, roleNe: "admin" });
    const verifiedUsers = User.count({ isAccountVerified: true });
    const manufacturers = User.count({ role: "manufacturer" });
    const logistics = User.count({ role: "logistics" });
    const totalOrders = Order.count({});
    const pendingOrders = Order.count({ status: "pending" });
    const deliveredOrders = Order.count({ status: "delivered" });

    res.status(200).json({
      success: true,
      stats: { totalUsers, pendingVerification, verifiedUsers, manufacturers, logistics, totalOrders, pendingOrders, deliveredOrders },
    });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getAllUsers = (req: Request, res: Response): void => {
  try {
    const { status, role, search } = req.query as Record<string, string | undefined>;
    const { page, limit, skip } = parsePagination(req.query);

    const filter: UserFilter = { roleNe: "admin" };

    if (status === "pending") {
      filter.submittedForVerification = true;
      filter.isAccountVerified = false;
    } else if (status === "verified") {
      filter.isAccountVerified = true;
    } else if (status === "rejected") {
      filter.hasRejectionReason = true;
    }

    if (role === "manufacturer" || role === "logistics") {
      delete filter.roleNe;
      filter.role = role;
    }

    if (search) filter.search = search;

    const users = User.findAll(filter, { sort: "created_at DESC", limit, skip });
    const total = User.count(filter);

    res.status(200).json({ success: true, users, pagination: buildPaginationMeta(total, page, limit) });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getUserById = (req: Request, res: Response): void => {
  try {
    const { userId } = req.params as { userId: string };
    const uid = parseInt(userId, 10);
    if (!Number.isInteger(uid) || uid < 1) {
      res.status(400).json({ success: false, message: "Invalid user ID" });
      return;
    }

    const user = User.findById(uid);
    if (!user || user.role === "admin") {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    const orderFilter = user.role === "manufacturer" ? { manufacturerId: uid } : { logisticsId: uid };
    const totalOrders = Order.count(orderFilter);
    const activeOrders = Order.count({ ...orderFilter, statusIn: ["accepted", "in transit"] });

    res.status(200).json({ success: true, user, orderStats: { totalOrders, activeOrders } });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const approveUser = (req: Request, res: Response): void => {
  try {
    const { userId } = req.params as { userId: string };
    const uid = parseInt(userId, 10);
    if (!Number.isInteger(uid) || uid < 1) {
      res.status(400).json({ success: false, message: "Invalid user ID" });
      return;
    }

    const existing = User.findById(uid);
    if (!existing || existing.role === "admin") {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    const user = User.update(uid, { isAccountVerified: true, submittedForVerification: false, rejectionReason: null });

    res.status(200).json({ success: true, message: `${user?.companyName} has been approved`, user });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const rejectUser = (req: Request, res: Response): void => {
  try {
    const { userId } = req.params as { userId: string };
    const { reason } = req.body as { reason: string };
    const uid = parseInt(userId, 10);
    if (!Number.isInteger(uid) || uid < 1) {
      res.status(400).json({ success: false, message: "Invalid user ID" });
      return;
    }

    const existing = User.findById(uid);
    if (!existing || existing.role === "admin") {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    const user = User.update(uid, { isAccountVerified: false, submittedForVerification: false, rejectionReason: reason.trim() });

    res.status(200).json({ success: true, message: `${user?.companyName} has been rejected`, user });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
};
