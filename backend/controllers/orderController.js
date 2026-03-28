const Order = require("../models/orderModel");
const crypto = require("crypto");
const { notifyLogisticsNewOrder } = require("../websocket/orderEvents");

async function createOrder(req, res) {
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

    if (
      !productDetails ||
      !quantity ||
      !weight ||
      !vehicleType ||
      !routeFrom ||
      !expectedPrice ||
      !routeTo
    ) {
      return res.status(400).json({
        success: false,
        message:
          "productDetails, quantity, weight, vehicleType, routeFrom, expectedPrice and routeTo are required",
      });
    }

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
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
}
async function getAvailableOrders(req, res) {
  try {
    const role = req.user.role;

    if (role === "manufacturer") {
      const orders = await Order.find({ manufacturer: req.user.id })
        .populate("manufacturer", "companyName email")
        .populate("logistics", "companyName email")
        .sort({ createdAt: -1 });

      return res.status(200).json({ success: true, orders });
    } else if (role === "logistics") {
      const orders = await Order.find({ logistics: null, status: "pending" })
        .populate("manufacturer", "companyName email")
        .sort({ createdAt: -1 });

      return res.status(200).json({ success: true, orders });
    } else {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
}

async function getMyOrders(req, res) {
  try {
    const role = req.user.role;

    if (role === "logistics") {
      const orders = await Order.find({ logistics: req.user.id })
        .populate("manufacturer", "companyName email")
        .sort({ updatedAt: -1 });

      return res.status(200).json({ success: true, orders });
    } else if (role === "manufacturer") {
      const orders = await Order.find({ manufacturer: req.user.id })
        .populate("logistics", "companyName email")
        .sort({ createdAt: -1 });

      return res.status(200).json({ success: true, orders });
    } else {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
}

async function getOrderDetails(req, res) {
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

    return res.status(200).json({ success: true, order });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
}

async function updateOrderStatus(req, res) {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    const VALID_STATUSES = ["accepted", "in transit", "delivered", "cancelled"];
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

    return res.status(200).json({ success: true, order });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
}

module.exports = {
  createOrder,
  getAvailableOrders,
  getMyOrders,
  getOrderDetails,
  updateOrderStatus,
};
