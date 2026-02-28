require("dotenv").config();
const express = require("express");
const WebSocket = require("ws");
const http = require("http");
const server = http.createServer();
const wss = new WebSocket.Server({ server });
const mongoose = require("mongoose");
const cors = require("cors");

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

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

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

app.get("/", (req, res) => {
  res.send("RouteFlow API is running");
});

app.post("/auth/register", createUser);
app.post("/auth/login", loginUser);
app.post("/auth/verify-otp", verifyOtp);
app.post("/auth/resend-otp", resendOtp);
app.post("/auth/forgot-password", forgotPassword);
app.post("/auth/reset-password", resetPassword);
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



server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


// WebSocket server for real-time updates
server.on("connection", (ws) => {
  console.log("WebSocket client connected");
  ws.on("message", (message) => {
    console.log("Received message:", message);
    ws.send(`Message sent: ${message}`);
  });

  ws.on("close", () => {
    console.log("WebSocket client disconnected");
  });
});

if (!MONGO_URI) {
  console.error("MONGO_URI is missing in .env");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error.message);
    process.exit(1);
  });
