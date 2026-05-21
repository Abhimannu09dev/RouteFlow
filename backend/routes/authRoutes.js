import { Router } from "express";
import {
  createUser,
  loginUser,
  verifyOtp,
  resendOtp,
  forgotPassword,
  resetPassword,
} from "../controllers/userController.js";
import validate from "../middleware/validate.js";
import { strictLimiter } from "../middleware/rateLimiter.js";
import {
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  resendOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validators/authValidators.js";

const authRouter = Router();

authRouter.post("/register", validate(registerSchema), createUser);
authRouter.post("/login", strictLimiter, validate(loginSchema), loginUser);
authRouter.post("/verify-otp", strictLimiter, validate(verifyOtpSchema), verifyOtp);
authRouter.post("/resend-otp", strictLimiter, validate(resendOtpSchema), resendOtp);
authRouter.post(
  "/forgot-password",
  strictLimiter,
  validate(forgotPasswordSchema),
  forgotPassword,
);
authRouter.post(
  "/reset-password",
  strictLimiter,
  validate(resetPasswordSchema),
  resetPassword,
);

export default authRouter;
