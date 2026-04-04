import User from "../models/userModel.js";
import Order from "../models/orderModel.js";

const parsePagination = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const buildPaginationMeta = (total, page, limit) => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
});

const HIDDEN_FIELDS =
  "-password -otpHash -otpExpires -resetTokenHash -resetTokenExpires";

// Get platform-wide stats for admin dashboard
const getAdminStats = async (req, res) => {
  try {
    const [
      totalUsers,
      pendingVerification,
      verifiedUsers,
      manufacturers,
      logistics,
      totalOrders,
      pendingOrders,
      deliveredOrders,
    ] = await Promise.all([
      User.countDocuments({ role: { $ne: "admin" } }),
      User.countDocuments({
        submittedForVerification: true,
        isAccountVerified: false,
        role: { $ne: "admin" },
      }),
      User.countDocuments({ isAccountVerified: true }),
      User.countDocuments({ role: "manufacturer" }),
      User.countDocuments({ role: "logistics" }),
      Order.countDocuments(),
      Order.countDocuments({ status: "pending" }),
      Order.countDocuments({ status: "delivered" }),
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        pendingVerification,
        verifiedUsers,
        manufacturers,
        logistics,
        totalOrders,
        pendingOrders,
        deliveredOrders,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// Get all users with optional filters and pagination
// Query params: ?status=pending|verified|rejected&role=manufacturer|logistics&search=text&page=1&limit=10
const getAllUsers = async (req, res) => {
  try {
    const { status, role, search } = req.query;
    const { page, limit, skip } = parsePagination(req.query);

    const filter = { role: { $ne: "admin" } };

    if (status === "pending") {
      filter.submittedForVerification = true;
      filter.isAccountVerified = false;
    } else if (status === "verified") {
      filter.isAccountVerified = true;
    } else if (status === "rejected") {
      filter.rejectionReason = { $exists: true, $ne: null };
      filter.isAccountVerified = false;
    }

    if (role === "manufacturer" || role === "logistics") {
      filter.role = role;
    }

    if (search) {
      filter.$or = [
        { companyName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select(HIDDEN_FIELDS)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      users,
      pagination: buildPaginationMeta(total, page, limit),
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// Get a single user by ID with their order stats
const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select(HIDDEN_FIELDS);
    if (!user || user.role === "admin") {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const orderFilter =
      user.role === "manufacturer"
        ? { manufacturer: userId }
        : { logistics: userId };

    const [totalOrders, activeOrders] = await Promise.all([
      Order.countDocuments(orderFilter),
      Order.countDocuments({
        ...orderFilter,
        status: { $in: ["accepted", "in transit"] },
      }),
    ]);

    return res.status(200).json({
      success: true,
      user,
      orderStats: { totalOrders, activeOrders },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// Approve a user's account verification
const approveUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        isAccountVerified: true,
        submittedForVerification: false,
        rejectionReason: undefined,
      },
      { new: true },
    ).select(HIDDEN_FIELDS);

    if (!user || user.role === "admin") {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      message: `${user.companyName} has been approved`,
      user,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// Reject a user's verification with a reason
const rejectUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    if (!reason?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Rejection reason is required" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        isAccountVerified: false,
        submittedForVerification: false,
        rejectionReason: reason.trim(),
      },
      { new: true },
    ).select(HIDDEN_FIELDS);

    if (!user || user.role === "admin") {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      message: `${user.companyName} has been rejected`,
      user,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

export { getAdminStats, getAllUsers, getUserById, approveUser, rejectUser };
