import crypto from "crypto";
import type { Request, Response } from "express";
import Order from "../models/orderModel.js";
import { notifyLogisticsNewOrder, notifyManufacturerStatusUpdate } from "../websocket/orderEvents.js";
import { parsePagination, buildPaginationMeta } from "../utils/pagination.js";
import type { OrderStatus } from "../types/index.js";

const VALID_STATUSES: OrderStatus[] = ["accepted", "in transit", "delivered", "cancelled"];

export const createOrder = (req: Request, res: Response): void => {
  try {
    if (req.user.role !== "manufacturer") {
      res.status(403).json({ success: false, message: "Only manufacturers can create orders" });
      return;
    }

    const {
      productDetails, quantity, weight, vehicleType,
      invoiceNeeded, vatBillNeeded, routeFrom, routeTo, additionalInfo, expectedPrice,
    } = req.body as Record<string, unknown>;

    const order = Order.create({
      orderId: "ORD-" + crypto.randomBytes(9).toString("hex").toUpperCase(),
      manufacturerId: req.user.id,
      productDetails: productDetails as string,
      quantity: quantity as number,
      weight: weight as number,
      vehicleType: vehicleType as string,
      invoiceNeeded: (invoiceNeeded as boolean | undefined) ?? false,
      vatBillNeeded: (vatBillNeeded as boolean | undefined) ?? false,
      routeFrom: routeFrom as string,
      routeTo: routeTo as string,
      additionalInfo: (additionalInfo as string | undefined) ?? "",
      expectedPrice: (expectedPrice as number | undefined) ?? null,
    });

    if (order) notifyLogisticsNewOrder(order);

    res.status(201).json({ success: true, order });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getAvailableOrders = (req: Request, res: Response): void => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { role } = req.user;

    if (role === "manufacturer") {
      const orders = Order.find({ manufacturerId: req.user.id }, { sort: "o.created_at DESC", limit, skip });
      const total = Order.count({ manufacturerId: req.user.id });
      res.status(200).json({ success: true, orders, pagination: buildPaginationMeta(total, page, limit) });
      return;
    }

    if (role === "logistics") {
      const orders = Order.find({ logisticsNull: true, status: "pending" }, { sort: "o.created_at DESC", limit, skip });
      const total = Order.count({ logisticsNull: true, status: "pending" });
      res.status(200).json({ success: true, orders, pagination: buildPaginationMeta(total, page, limit) });
      return;
    }

    res.status(403).json({ success: false, message: "Access denied" });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getMyOrders = (req: Request, res: Response): void => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { role } = req.user;
    const statusFilter = req.query["status"] as string | undefined;

    if (role === "logistics") {
      const status =
        statusFilter && statusFilter !== "all" ? (statusFilter as OrderStatus) : undefined;
      const filter = { logisticsId: req.user.id, status };
      const orders = Order.find(filter, { sort: "o.updated_at DESC", limit, skip });
      const total = Order.count(filter);
      res.status(200).json({ success: true, orders, pagination: buildPaginationMeta(total, page, limit) });
      return;
    }

    if (role === "manufacturer") {
      const status =
        statusFilter && statusFilter !== "all" ? (statusFilter as OrderStatus) : undefined;
      const filter = { manufacturerId: req.user.id, status };
      const orders = Order.find(filter, { sort: "o.created_at DESC", limit, skip });
      const total = Order.count(filter);
      res.status(200).json({ success: true, orders, pagination: buildPaginationMeta(total, page, limit) });
      return;
    }

    res.status(403).json({ success: false, message: "Access denied" });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getOrderDetails = (req: Request, res: Response): void => {
  try {
    const { orderId } = req.params as { orderId: string };

    const order = Order.findByOrderId(orderId);
    if (!order) { res.status(404).json({ success: false, message: "Order not found" }); return; }

    const userId = String(req.user.id);
    const isManufacturer = String(order.manufacturer?.id) === userId;
    const isAssignedLogistics = String(order.logistics?.id) === userId;
    const isAdmin = req.user.role === "admin";
    const isLogisticsViewingAvailable =
      req.user.role === "logistics" && order.status === "pending" && !order.logistics;

    if (!isManufacturer && !isAssignedLogistics && !isAdmin && !isLogisticsViewingAvailable) {
      res.status(403).json({ success: false, message: "Not authorized" });
      return;
    }

    res.status(200).json({ success: true, order });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateOrderStatus = (req: Request, res: Response): void => {
  try {
    const { orderId } = req.params as { orderId: string };
    const { status } = req.body as { status: OrderStatus };

    if (!VALID_STATUSES.includes(status)) {
      res.status(400).json({ success: false, message: `Status must be one of: ${VALID_STATUSES.join(", ")}` });
      return;
    }

    const order = Order.updateByOrderId(orderId, req.user.id, { status });
    if (!order) {
      res.status(404).json({ success: false, message: "Order not found or you are not the assigned logistics partner" });
      return;
    }

    notifyManufacturerStatusUpdate(order, status, order.logistics?.companyName ?? "");

    res.status(200).json({ success: true, order });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getOrderStats = (req: Request, res: Response): void => {
  try {
    if (req.user.role !== "manufacturer") {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    const stats = Order.getStats(req.user.id);
    res.status(200).json({ success: true, stats });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
};
