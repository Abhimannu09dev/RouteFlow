const express = require("express");

const authRoutes = require("./authRoutes");
const orderRoutes = require("./orderRoutes");
const profileRoutes = require("./profileRoutes");
const adminRoutes = require("./adminRoutes");

const { auth } = require("../middleware/auth");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/", auth, orderRoutes);
router.use("/", auth, profileRoutes);
router.use("/admin", auth, adminRoutes);

module.exports = router;
