import express from "express";
import {
  getPaymentStatus,
  initiateKhalti,
  verifyKhalti,
  initiateEsewa,
  verifyEsewa,
} from "../controllers/paymentController";

const router = express.Router();

// check payment status for an order
router.get("/status/:orderId", getPaymentStatus);

// start Khalti payment
router.post("/khalti/initiate", initiateKhalti);

// verify after Khalti redirect
router.get("/khalti/verify", verifyKhalti);

// start eSewa payment
router.post("/esewa/initiate", initiateEsewa);

// verify after eSewa redirect
router.get("/esewa/verify", verifyEsewa);

export default router;
