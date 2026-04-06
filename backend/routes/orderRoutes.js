import { Router } from "express";
import {
  createOrder,
  getAvailableOrders,
  getOrderDetails,
  updateOrderStatus,
  getMyOrders,
} from "../controllers/orderController.js";
import { getMyOffers } from "../controllers/priceOfferController.js";
import { rolecheck } from "../middleware/auth.js";

const router = Router();

router.post("/create/order", createOrder);
router.get("/orders", getAvailableOrders);
router.get("/my-orders", getMyOrders);
router.get("/orders/my-offers", rolecheck(["logistics"]), getMyOffers); // ← static, before /:orderId
router.get("/orders/:orderId", getOrderDetails);
router.put(
  "/orders/:orderId/status",
  rolecheck(["logistics"]),
  updateOrderStatus,
);

export default router;
