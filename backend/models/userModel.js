const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema({
  name: { type: String, required: true },
  role: {
    type: String,
    enum: ["logistic", "manufacturer"],
    default: "logistic",
  },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, minlength: 6 },
  isVerified: { type: Boolean, default: false },
  otpHash: { type: String },
  otpExpires: { type: Date },
  resetTokenHash: { type: String },
  resetTokenExpires: { type: Date },
});

const User = mongoose.model("User", userSchema);

module.exports = User;
