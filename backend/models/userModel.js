const mongoose = require("mongoose");
const { Schema } = mongoose;

const documentSchema = new Schema({
  type: {
    type: String,
    enum: [
      "company_registration",
      "tax_clearance",
      "pan_certificate",
      "vat_certificate",
      "other",
    ],
    required: true,
  },
  label: { type: String },
  filename: { type: String, required: true },
  url: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
});

const userSchema = new Schema({
  companyName: { type: String, required: true },
  role: {
    type: String,
    enum: ["logistics", "manufacturer", "admin"],
    default: "logistics",
  },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, minlength: 6 },
  contactNumber: { type: String },
  panNo: { type: String },
  companyLocation: { type: String },
  companyDescription: { type: String },
  companyLogo: { type: String },
  companyWebsite: { type: String },
  documents: [documentSchema],
  isVerified: { type: Boolean, default: false },
  isAccountVerified: { type: Boolean, default: false },
  submittedForVerification: { type: Boolean, default: false },
  rejectionReason: { type: String },
  otpHash: { type: String },
  otpExpires: { type: Date },
  resetTokenHash: { type: String },
  resetTokenExpires: { type: Date },
});

const User = mongoose.model("User", userSchema);
module.exports = User;
