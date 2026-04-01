import { Router } from "express";
import authRoutes from "./authRoutes";
import orderRoutes from "./orderRoutes";
import profileRoutes from "./profileRoutes";
import adminRoutes from "./adminRoutes";
import priceOfferRoutes from "./priceOfferRoutes";
import notificationRoutes from "./notificationRoutes";
import chatRoutes from "./chatRoutes";
import settingsRoutes from "./settingsRoutes";
import supportRoutes from "./supportRoutes";
import paymentRoutes from "./paymentRoutes";
import { auth } from "../middleware/auth";

const router = Router();

router.use("/auth", authRoutes);
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
