require("dotenv").config();

const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");

const { initWebSocket } = require("./websocket");

// Controllers
const {
  createUser,
  loginUser,
  verifyOtp,
  resendOtp,
  forgotPassword,
  resetPassword,
} = require("./controller/userController");

const {
  createOrder,
  getAvailableOrders,
  updateOrderStatus,
  getOrderDetails,
  acceptOrder,
  getMyOrders,
} = require("./controller/orderController");

const { auth, rolecheck } = require("./middleware/auth");

// App Setup
const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// Middleware
app.use(express.json());

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:5173",
      process.env.FRONTEND_URL || "http://localhost:3000",
    ],
    credentials: true,
  }),
);

// Basic Route
app.get("/", (req, res) => {
  res.send("RouteFlow API is running");
});

// Auth Routes
app.post("/auth/register", createUser);
app.post("/auth/login", loginUser);
app.post("/auth/verify-otp", verifyOtp);
app.post("/auth/resend-otp", resendOtp);
app.post("/auth/forgot-password", forgotPassword);
app.post("/auth/reset-password", resetPassword);

// Order Routes
app.post("/create/order", auth, createOrder);
app.get("/orders", auth, getAvailableOrders);

app.put(
  "/orders/:orderId/status",
  auth,
  rolecheck(["logistics"]),
  updateOrderStatus,
);

app.get("/orders/:orderId", auth, getOrderDetails);

app.put("/orders/:orderId/accept", auth, rolecheck(["logistics"]), acceptOrder);

app.get("/my-orders", auth, getMyOrders);

// Database + Server Start

if (!MONGO_URI) {
  console.error("MONGO_URI is missing in .env");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");

    // Initialize WebSocket AFTER DB is ready
    initWebSocket(server);

    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error.message);
    process.exit(1);
  });
