import User from "../models/userModel.js";
import Order from "../models/orderModel.js";
import { parsePagination, buildPaginationMeta } from "../utils/pagination.js";

const getAdminStats = (req, res) => {
  try {
    const totalUsers = User.count({ roleNe: "admin" });
    const pendingVerification = User.count({ submittedForVerification: true, isAccountVerified: false, roleNe: "admin" });
    const verifiedUsers = User.count({ isAccountVerified: true });
    const manufacturers = User.count({ role: "manufacturer" });
    const logistics = User.count({ role: "logistics" });
    const totalOrders = Order.count({});
    const pendingOrders = Order.count({ status: "pending" });
    const deliveredOrders = Order.count({ status: "delivered" });

    return res.status(200).json({
      success: true,
      stats: { totalUsers, pendingVerification, verifiedUsers, manufacturers, logistics, totalOrders, pendingOrders, deliveredOrders },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const getAllUsers = (req, res) => {
  try {
    const { status, role, search } = req.query;
    const { page, limit, skip } = parsePagination(req.query);

    const filter = { roleNe: "admin" };

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

    return res.status(200).json({ success: true, users, pagination: buildPaginationMeta(total, page, limit) });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const getUserById = (req, res) => {
  try {
    const { userId } = req.params;
    const uid = parseInt(userId, 10);
    if (!Number.isInteger(uid) || uid < 1) {
      return res.status(400).json({ success: false, message: "Invalid user ID" });
    }

    const user = User.findById(uid);
    if (!user || user.role === "admin") {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const orderFilter = user.role === "manufacturer" ? { manufacturerId: uid } : { logisticsId: uid };
    const totalOrders = Order.count(orderFilter);
    const activeOrders = Order.count({ ...orderFilter, statusIn: ["accepted", "in transit"] });

    return res.status(200).json({ success: true, user, orderStats: { totalOrders, activeOrders } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const approveUser = (req, res) => {
  try {
    const { userId } = req.params;
    const uid = parseInt(userId, 10);
    if (!Number.isInteger(uid) || uid < 1) {
      return res.status(400).json({ success: false, message: "Invalid user ID" });
    }

    const existing = User.findById(uid);
    if (!existing || existing.role === "admin") {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const user = User.update(uid, { isAccountVerified: true, submittedForVerification: false, rejectionReason: null });

    return res.status(200).json({ success: true, message: `${user.companyName} has been approved`, user });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const rejectUser = (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    const uid = parseInt(userId, 10);
    if (!Number.isInteger(uid) || uid < 1) {
      return res.status(400).json({ success: false, message: "Invalid user ID" });
    }

    const existing = User.findById(uid);
    if (!existing || existing.role === "admin") {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const user = User.update(uid, { isAccountVerified: false, submittedForVerification: false, rejectionReason: reason.trim() });

    return res.status(200).json({ success: true, message: `${user.companyName} has been rejected`, user });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export { getAdminStats, getAllUsers, getUserById, approveUser, rejectUser };
