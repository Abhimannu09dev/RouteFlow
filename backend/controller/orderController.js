const User = require("../models/userModel");
const Order = require("../models/orderModel");
const crypto = require("crypto");

// Create a new order
async function createOrder(req, res) {
  try {
    const { productDetails, quantity, routeForm, routeTo, additionalInfo } =
      req.body;

    const order = new Order({
      orderId: "ORD-" + crypto.randomBytes(9).toString("hex").toUpperCase(),
      manufacturer: req.user.id,
      productDetails,
      quantity,
      routeForm,
      routeTo,
      additionalInfo,
    });

    console.log("Creating order with data:", {
      orderId: order.orderId,
      manufacturer: order.manufacturer,
      productDetails: order.productDetails,
      quantity: order.quantity,
      routeForm: order.routeForm,
      routeTo: order.routeTo,
      additionalInfo: order.additionalInfo,
    });

    await order.save();
    res.status(201).json(order);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    if (req.user.role !== "manufacturer") {
      return res.status(403).json({ message: "Access denied" });
    }

    res.status(500).json({ message: "Server error", error: error.message });
  }
}

// Get all orders for a user
async function getAvailableOrders(req, res) {
  try {
    const role = req.user.role;

    if (role === "manufacturer") {
      try {
        const orders = await Order.find({ manufacturer: req.user.id }).populate(
          "manufacturer",
          "companyName email",
        );
        if (orders.length === 0) {
          return res.status(404).json({ message: "No orders found" });
        }
        return res.status(200).json(orders);
      } catch (error) {
        return res
          .status(500)
          .json({ message: "Server error", error: error.message });
      }
    } else if (role === "logistic") {
      // Logistic companies can only see orders that are not yet accepted
      const orders = await Order.find({ logistic: null }).populate(
        "manufacturer",
        "companyName email",
      );

      if (orders.length === 0) {
        return res.status(404).json({ message: "No available orders found" });
      }

      return res.status(200).json(orders);
    } else {
      return res.status(403).json({ message: "Access denied" });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
}

// Update order status - it can be used by logistic companies to update the status of the order (e.g., in transit, delivered)
async function updateOrderStatus(req, res) {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;
    const { status } = req.body;
    const order = await Order.findOneAndUpdate(
      { orderId, logistic: userId },
      { status, updatedAt: Date.now() },
      { new: true },
    );
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
}

// Get order details
async function getOrderDetails(req, res) {
  try {
    const { orderId } = req.params;
    const order = await Order.findOne({ orderId })
      .populate("manufacturer", "companyName email")
      .populate("logistic", "companyName email");
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
}

// Function to accept an order by a logistic company
async function acceptOrder(req, res) {
  try {
    const { orderId } = req.params;
    const logisticId = req.user.id;

    const updated = await Order.findOneAndUpdate(
      { orderId: orderId, logistic: null }, // only if still open
      { logistic: logisticId, status: "accepted", updatedAt: Date.now() },
      { new: true },
    )
      .populate("manufacturer", "companyName email")
      .populate("logistic", "companyName email");

    if (!updated) {
      return res
        .status(409)
        .json({ message: "Order already taken or not found" });
    }

    return res.status(200).json(updated);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
}

// Function to view all the accepted orders for a logistic company and listed by the manufacturer
async function getMyOrders(req, res) {
  const role = req.user.role;

  if (role === "logistic") {
    try {
      const orders = await Order.find({ logistic: req.user.id }).populate(
        "manufacturer",
        "companyName email",
      );

      if (orders.length === 0) {
        return res.status(404).json({ message: "No assigned orders found" });
      }

      return res.status(200).json(orders);
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Server error", error: error.message });
    }
  } else if (role === "manufacturer") {
    try {
      const orders = await Order.find({ manufacturer: req.user.id }).populate(
        "logistic",
        "companyName email",
      );
      return res.status(200).json(orders);
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Server error", error: error.message });
    }
  } else {
    return res.status(403).json({ message: "Access denied" });
  }
}

module.exports = {
  createOrder,
  getAvailableOrders,
  updateOrderStatus,
  getOrderDetails,
  acceptOrder,
  getMyOrders,
};
