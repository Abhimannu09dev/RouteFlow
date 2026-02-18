const User = require("../models/userModel");
const Order = require("../models/orderModel");

// Create a new order
exports.createOrder = async (req, res) => {
  try {
    const {
      manufacturerId,
      productDetails,
      quantity,
      routeForm,
      routeTo,
      additionalInfo,
    } = req.body;
    
    const order = new Order({
      manufacturer: manufacturerId,
      productDetails,
      quantity,
      routeForm,
      routeTo,
      additionalInfo,
    });
    await order.save();
    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all orders for a user
exports.getOrders = async (req, res) => {
  try {
    const userId = req.user.id; // Assuming user ID is available in the request
    const orders = await Order.find({
      $or: [{ manufacturer: userId }, { logistic: userId }],
    })
      .populate("manufacturer", "name email")
      .populate("logistic", "name email");
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const order = await Order.findOneAndUpdate(
      { orderId },
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
};

// Get order details
exports.getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findOne({ orderId })
      .populate("manufacturer", "name email")
      .populate("logistic", "name email");
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
