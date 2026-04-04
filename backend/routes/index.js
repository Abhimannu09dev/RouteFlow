import { Router } from "express";
import authRouter from "./authRoutes.js";
import orderRoutes from "./orderRoutes.js";
import profileRoutes from "./profileRoutes.js";
import adminRoutes from "./adminRoutes.js";
import priceOfferRoutes from "./priceOfferRoutes.js";
import notificationRoutes from "./notificationRoutes.js";
import chatRoutes from "./chatRoutes.js";
import settingsRoutes from "./settingsRoutes.js";
import supportRoutes from "./supportRoutes.js";
import paymentRoutes from "./paymentRoutes.js";
import { auth } from "../middleware/auth.js";

const router = Router();

router.use("/auth", authRouter);
router.use("/", auth, orderRoutes);
router.use("/orders", auth, priceOfferRoutes);
router.use("/profile", auth, profileRoutes);
router.use("/admin", auth, adminRoutes);
router.use("/notifications", auth, notificationRoutes);
router.use("/chat", auth, chatRoutes);
router.use("/settings", auth, settingsRoutes);
router.use("/support", auth, supportRoutes);
router.use("/payment", auth, paymentRoutes);

export default router;
