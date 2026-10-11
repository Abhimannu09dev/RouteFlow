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
router.use(auth);
router.use("/", orderRoutes);
router.use("/orders", priceOfferRoutes);
router.use("/profile", profileRoutes);
router.use("/admin", adminRoutes);
router.use("/notifications", notificationRoutes);
router.use("/chat", chatRoutes);
router.use("/settings", settingsRoutes);
router.use("/support", supportRoutes);
router.use("/payment", paymentRoutes);

export default router;
