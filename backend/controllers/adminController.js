import User from "../models/userModel.js";
import Order from "../models/orderModel.js";

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
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const { status, role, search } = req.query;
    const filter = { role: { $ne: "admin" } };

    // Filter by verification status
    if (status === "pending") {
      filter.submittedForVerification = true;
      filter.isAccountVerified = false;
    } else if (status === "verified") {
      filter.isAccountVerified = true;
    } else if (status === "rejected") {
      filter.rejectionReason = { $exists: true, $ne: null };
      filter.isAccountVerified = false;
    }

    // Filter by role
    if (role === "manufacturer" || role === "logistics") {
      filter.role = role;
    }

    // Search by company name or email
    if (search) {
      filter.$or = [
        { companyName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(filter)
      .select(
        "-password -otpHash -otpExpires -resetTokenHash -resetTokenExpires",
      )
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, users });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select(
      "-password -otpHash -otpExpires -resetTokenHash -resetTokenExpires",
    );

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
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

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
    ).select(
      "-password -otpHash -otpExpires -resetTokenHash -resetTokenExpires",
    );

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
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const rejectUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        isAccountVerified: false,
        submittedForVerification: false,
        rejectionReason: reason.trim(),
      },
      { new: true },
    ).select(
      "-password -otpHash -otpExpires -resetTokenHash -resetTokenExpires",
    );

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
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

export { getAdminStats, getAllUsers, getUserById, approveUser, rejectUser };
