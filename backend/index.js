require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const {
  createUser,
  loginUser,
  verifyOtp,
  resendOtp,
} = require("./controller/userController");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    credentials: true,
  }),
);

app.get("/", (req, res) => {
  res.send("Hello World from Node.js!");
});

app.post("/auth/register", createUser);
app.post("/auth/login", loginUser);
app.post("/auth/verify-otp", verifyOtp);
app.post("/auth/resend-otp", resendOtp);

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
