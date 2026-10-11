import crypto from "crypto";
import mongoose from "mongoose";
import Order from "../models/orderModel.js";
import PriceOffer from "../models/priceOfferModel.js";
import {
  notifyLogisticsNewOrder,
  notifyManufacturerStatusUpdate,
} from "../websocket/orderEvents.js";

import { parsePagination, buildPaginationMeta } from "../utils/pagination.js";

const VALID_STATUSES = ["accepted", "in transit", "delivered", "cancelled"];

// Create a new order (manufacturer only)
const createOrder = async (req, res) => {
  try {
    if (req.user.role !== "manufacturer") {
      return res.status(403).json({
        success: false,
        message: "Only manufacturers can create orders",
      });
    }

    const {
      productDetails,
      quantity,
      weight,
      vehicleType,
      invoiceNeeded,
      vatBillNeeded,
      routeFrom,
      routeTo,
      additionalInfo,
      expectedPrice,
    } = req.body;

    const order = new Order({
      orderId: "ORD-" + crypto.randomBytes(9).toString("hex").toUpperCase(),
      manufacturer: req.user.id,
      productDetails,
      quantity,
      weight,
      vehicleType,
      invoiceNeeded: invoiceNeeded ?? false,
      vatBillNeeded: vatBillNeeded ?? false,
      routeFrom,
      routeTo,
      additionalInfo: additionalInfo || "",
      expectedPrice: expectedPrice || null,
    });

    await order.save();
    notifyLogisticsNewOrder(order);

    return res.status(201).json({ success: true, order });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    return res
      .status(500)
      .json({ success: false, message: "Server error" });
  }
};

// Get orders list — manufacturer sees their orders, logistics sees available pending orders
// Supports pagination via ?page=1&limit=10
const getAvailableOrders = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const role = req.user.role;

    if (role === "manufacturer") {
      const filter = { manufacturer: req.user.id };
      const [orders, total] = await Promise.all([
        Order.find(filter)
          .populate("manufacturer", "companyName email")
          .populate("logistics", "companyName email")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Order.countDocuments(filter),
      ]);
      return res.status(200).json({
        success: true,
        orders,
        pagination: buildPaginationMeta(total, page, limit),
      });
    }

    if (role === "logistics") {
      const filter = { logistics: null, status: "pending" };
      const [orders, total] = await Promise.all([
        Order.find(filter)
          .populate("manufacturer", "companyName email")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Order.countDocuments(filter),
      ]);
      return res.status(200).json({
        success: true,
        orders,
        pagination: buildPaginationMeta(total, page, limit),
      });
    }

    return res.status(403).json({ success: false, message: "Access denied" });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Server error" });
  }
};

// Get orders assigned to the logged-in user (history)
// Supports pagination via ?page=1&limit=10
const getMyOrders = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const role = req.user.role;
    const statusFilter = req.query.status;

    if (role === "logistics") {
      const filter = { logistics: req.user.id };
      if (statusFilter && statusFilter !== "all") filter.status = statusFilter;
      const [orders, total] = await Promise.all([
        Order.find(filter)
          .populate("manufacturer", "companyName email")
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(limit),
        Order.countDocuments(filter),
      ]);
      return res.status(200).json({
        success: true,
        orders,
        pagination: buildPaginationMeta(total, page, limit),
      });
    }

    if (role === "manufacturer") {
      const filter = { manufacturer: req.user.id };
      if (statusFilter && statusFilter !== "all") filter.status = statusFilter;
      const [orders, total] = await Promise.all([
        Order.find(filter)
          .populate("logistics", "companyName email")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Order.countDocuments(filter),
      ]);
      return res.status(200).json({
        success: true,
        orders,
        pagination: buildPaginationMeta(total, page, limit),
      });
    }

    return res.status(403).json({ success: false, message: "Access denied" });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Server error" });
  }
};

// Get a single order by orderId string
const getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ orderId })
      .populate("manufacturer", "companyName email")
      .populate("logistics", "companyName email");

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    const userId = req.user.id;
    const isManufacturer = order.manufacturer._id.toString() === userId;
    const isAssignedLogistics = order.logistics?._id?.toString() === userId;
    const isAdmin = req.user.role === "admin";
    const isLogisticsViewingAvailable =
      req.user.role === "logistics" &&
      order.status === "pending" &&
      !order.logistics;

    if (!isManufacturer && !isAssignedLogistics && !isAdmin && !isLogisticsViewingAvailable) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    return res.status(200).json({ success: true, order });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Server error" });
  }
};

// Update order status (logistics only — must be the assigned partner)
const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${VALID_STATUSES.join(", ")}`,
      });
    }

    const order = await Order.findOneAndUpdate(
      { orderId, logistics: userId },
      { status, updatedAt: Date.now() },
      { new: true },
    )
      .populate("manufacturer", "companyName email")
      .populate("logistics", "companyName email");

    if (!order) {
      return res.status(404).json({
        success: false,
        message:
          "Order not found or you are not the assigned logistics partner",
      });
    }

    notifyManufacturerStatusUpdate(order, status, order.logistics.companyName);

    return res.status(200).json({ success: true, order });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Server error" });
  }
};

// Get order status counts for manufacturer dashboard tabs
const getOrderStats = async (req, res) => {
  try {
    if (req.user.role !== "manufacturer") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const [results] = await Order.aggregate([
      { $match: { manufacturer: new mongoose.Types.ObjectId(req.user.id) } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
          accepted: { $sum: { $cond: [{ $eq: ["$status", "accepted"] }, 1, 0] } },
          inTransit: { $sum: { $cond: [{ $eq: ["$status", "in transit"] }, 1, 0] } },
          delivered: { $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      stats: results || { total: 0, pending: 0, accepted: 0, inTransit: 0, delivered: 0, cancelled: 0 },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export {
  createOrder,
  getAvailableOrders,
  getMyOrders,
  getOrderDetails,
  getOrderStats,
  updateOrderStatus,
};
