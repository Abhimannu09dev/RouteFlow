const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema({
  companyName: { type: String, required: true },
  role: {
    type: String,
    enum: ["logistics", "manufacturer"],
    default: "logistics",
  },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, minlength: 6 },
  contactNumber: { type: String },
  panNo: { type: String },
  companyLocation: { type: String },
  companyDescription: { type: String },
  companyLogo: { type: String },
  companyDocument: { type: String },
  companyWebsite: { type: String },
  isVerified: { type: Boolean, default: false },
  isAccountVerified: { type: Boolean, default: false },
  otpHash: { type: String },
  otpExpires: { type: Date },
  resetTokenHash: { type: String },
  resetTokenExpires: { type: Date },
});

const User = mongoose.model("User", userSchema);

module.exports = User;
