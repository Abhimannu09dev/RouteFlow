import { Router } from "express";
import {
  getPaymentStatus,
  initiateKhalti,
  verifyKhalti,
  initiateEsewa,
  verifyEsewa,
  getMyPayments,
} from "../controllers/paymentController.js";
import { auth } from "../middleware/auth.js";
import validate from "../middleware/validate.js";
import { initiatePaymentSchema } from "../validators/paymentValidators.js";

const router = Router();

router.get("/status/:orderId", getPaymentStatus);
router.post(
  "/khalti/initiate",
  validate(initiatePaymentSchema),
  initiateKhalti,
);
router.get("/khalti/verify", auth, verifyKhalti);
router.post("/esewa/initiate", validate(initiatePaymentSchema), initiateEsewa);
router.get("/esewa/verify", auth, verifyEsewa);
router.get("/my-payments", getMyPayments);

export default router;
