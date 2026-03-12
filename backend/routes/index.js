const express = require("express");

const authRoutes = require("./authRoutes");
const orderRoutes = require("./orderRoutes");
const profileRoutes = require("./profileRoutes");

const auth = require("../middleware/authMiddleware");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/", auth, orderRoutes);
router.use("/", auth, profileRoutes);

module.exports = router;
