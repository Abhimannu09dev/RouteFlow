import { Router } from "express";
import {
  createOrder,
  getAvailableOrders,
  getOrderDetails,
  getOrderStats,
  updateOrderStatus,
  getMyOrders,
} from "../controllers/orderController.js";
import { getMyOffers, getMyOfferStats } from "../controllers/priceOfferController.js";
import { rolecheck, requireVerification } from "../middleware/auth.js";
import validate from "../middleware/validate.js";
import { createOrderSchema, updateOrderStatusSchema } from "../validators/orderValidators.js";

const router: ReturnType<typeof Router> = Router();

router.post("/create/order", requireVerification, validate(createOrderSchema), createOrder);
router.get("/orders", getAvailableOrders);
router.get("/my-orders", getMyOrders);
router.get("/orders/my-offers", rolecheck(["logistics"]), getMyOffers);
router.get("/orders/my-offers/stats", rolecheck(["logistics"]), getMyOfferStats);
router.get("/orders/stats", getOrderStats);
router.get("/orders/:orderId", getOrderDetails);
router.put("/orders/:orderId/status", rolecheck(["logistics"]), validate(updateOrderStatusSchema), updateOrderStatus);

export default router;
