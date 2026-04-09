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
authRouter.post("/login", validate(loginSchema), loginUser);
authRouter.post("/verify-otp", validate(verifyOtpSchema), verifyOtp);
authRouter.post("/resend-otp", validate(resendOtpSchema), resendOtp);
authRouter.post(
  "/forgot-password",
  validate(forgotPasswordSchema),
  forgotPassword,
);
authRouter.post(
  "/reset-password",
  validate(resetPasswordSchema),
  resetPassword,
);

export default authRouter;
