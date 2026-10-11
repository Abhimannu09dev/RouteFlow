import crypto from "crypto";
import Order from "../models/orderModel.js";
import PriceOffer from "../models/priceOfferModel.js";
import { notifyLogisticsNewOrder, notifyManufacturerStatusUpdate } from "../websocket/orderEvents.js";
import { parsePagination, buildPaginationMeta } from "../utils/pagination.js";

const VALID_STATUSES = ["accepted", "in transit", "delivered", "cancelled"];

const createOrder = (req, res) => {
  try {
    if (req.user.role !== "manufacturer") {
      return res.status(403).json({ success: false, message: "Only manufacturers can create orders" });
    }

    const { productDetails, quantity, weight, vehicleType, invoiceNeeded, vatBillNeeded, routeFrom, routeTo, additionalInfo, expectedPrice } = req.body;

    const order = Order.create({
      orderId: "ORD-" + crypto.randomBytes(9).toString("hex").toUpperCase(),
      manufacturerId: req.user.id,
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

    notifyLogisticsNewOrder(order);

    return res.status(201).json({ success: true, order });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const getAvailableOrders = (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const role = req.user.role;

    if (role === "manufacturer") {
      const filter = { manufacturerId: req.user.id };
      const orders = Order.find(filter, { sort: "o.created_at DESC", limit, skip });
      const total = Order.count({ manufacturerId: req.user.id });
      return res.status(200).json({ success: true, orders, pagination: buildPaginationMeta(total, page, limit) });
    }

    if (role === "logistics") {
      const filter = { logisticsNull: true, status: "pending" };
      const orders = Order.find(filter, { sort: "o.created_at DESC", limit, skip });
      const total = Order.count({ logisticsNull: true, status: "pending" });
      return res.status(200).json({ success: true, orders, pagination: buildPaginationMeta(total, page, limit) });
    }

    return res.status(403).json({ success: false, message: "Access denied" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const getMyOrders = (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const role = req.user.role;
    const statusFilter = req.query.status;

    if (role === "logistics") {
      const filter = { logisticsId: req.user.id };
      if (statusFilter && statusFilter !== "all") filter.status = statusFilter;
      const orders = Order.find(filter, { sort: "o.updated_at DESC", limit, skip });
      const total = Order.count(filter);
      return res.status(200).json({ success: true, orders, pagination: buildPaginationMeta(total, page, limit) });
    }

    if (role === "manufacturer") {
      const filter = { manufacturerId: req.user.id };
      if (statusFilter && statusFilter !== "all") filter.status = statusFilter;
      const orders = Order.find(filter, { sort: "o.created_at DESC", limit, skip });
      const total = Order.count(filter);
      return res.status(200).json({ success: true, orders, pagination: buildPaginationMeta(total, page, limit) });
    }

    return res.status(403).json({ success: false, message: "Access denied" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const getOrderDetails = (req, res) => {
  try {
    const { orderId } = req.params;

    const order = Order.findByOrderId(orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const userId = String(req.user.id);
    const isManufacturer = String(order.manufacturer?.id) === userId;
    const isAssignedLogistics = String(order.logistics?.id) === userId;
    const isAdmin = req.user.role === "admin";
    const isLogisticsViewingAvailable = req.user.role === "logistics" && order.status === "pending" && !order.logistics;

    if (!isManufacturer && !isAssignedLogistics && !isAdmin && !isLogisticsViewingAvailable) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    return res.status(200).json({ success: true, order });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const updateOrderStatus = (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: `Status must be one of: ${VALID_STATUSES.join(", ")}` });
    }

    const order = Order.updateByOrderId(orderId, userId, { status });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found or you are not the assigned logistics partner" });
    }

    notifyManufacturerStatusUpdate(order, status, order.logistics?.companyName);

    return res.status(200).json({ success: true, order });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const getOrderStats = (req, res) => {
  try {
    if (req.user.role !== "manufacturer") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const stats = Order.getStats(req.user.id);
    return res.status(200).json({ success: true, stats });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export { createOrder, getAvailableOrders, getMyOrders, getOrderDetails, getOrderStats, updateOrderStatus };
