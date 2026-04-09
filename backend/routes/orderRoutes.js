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
import validate from "../middleware/validate.js";
import {
  createOrderSchema,
  updateOrderStatusSchema,
} from "../validators/orderValidators.js";

const router = Router();

router.post("/create/order", validate(createOrderSchema), createOrder);
router.get("/orders", getAvailableOrders);
router.get("/my-orders", getMyOrders);
router.get("/orders/my-offers", rolecheck(["logistics"]), getMyOffers);
router.get("/orders/:orderId", getOrderDetails);
router.put(
  "/orders/:orderId/status",
  rolecheck(["logistics"]),
  validate(updateOrderStatusSchema),
  updateOrderStatus,
);

export default router;
