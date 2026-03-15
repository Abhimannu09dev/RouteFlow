const express = require("express");

const {
  createOrder,
  getAvailableOrders,
  updateOrderStatus,
  getOrderDetails,
  acceptOrder,
  getMyOrders,
} = require("../controllers/orderController");

const { auth, rolecheck } = require("../middleware/auth");

const router = express.Router();

router.post("/create/order", auth, createOrder);
router.get("/orders", auth, getAvailableOrders);
router.put(
  "/orders/:orderId/status",
  auth,
  rolecheck(["logistics"]),
  updateOrderStatus,
);
router.get("/orders/:orderId", auth, getOrderDetails);
router.put(
  "/orders/:orderId/accept",
  auth,
  rolecheck(["logistics"]),
  acceptOrder,
);
router.get("/my-orders", auth, getMyOrders);

module.exports = router;
