const express = require("express");
const router = express.Router();

const {
  createOrder,
  getAvailableOrders,
  getOrderDetails,
  updateOrderStatus,
  getMyOrders,
} = require("../controllers/orderController");

const { rolecheck } = require("../middleware/auth");

router.post("/create/order", createOrder);
router.get("/orders", getAvailableOrders);
router.get("/my-orders", getMyOrders);
router.get("/orders/:orderId", getOrderDetails);
router.put(
  "/orders/:orderId/status",
  rolecheck(["logistics"]),
  updateOrderStatus,
);

module.exports = router;
