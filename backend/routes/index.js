const express = require("express");
const router = express.Router();

const authRoutes = require("./authRoutes");
const orderRoutes = require("./orderRoutes");
const profileRoutes = require("./profileRoutes");
const adminRoutes = require("./adminRoutes");
const priceOfferRoutes = require("./priceOfferRoutes");
const notificationRoutes = require("./notificationRoutes");

const { auth } = require("../middleware/auth");

router.use("/auth", authRoutes);
router.use("/", auth, orderRoutes);
router.use("/orders", auth, priceOfferRoutes);
router.use("/profile", auth, profileRoutes);
router.use("/admin", auth, adminRoutes);
router.use("/notifications", auth, notificationRoutes);

module.exports = router;
