const User = require("../models/userModel");

// ── Get current user's profile
async function getProfile(req, res) {
  try {
    const user = await User.findById(req.user.id).select(
      "-password -otpHash -otpExpires -resetTokenHash -resetTokenExpires",
    );

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.status(200).json({ success: true, user });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
}

// ── Update current user's profile
async function updateProfile(req, res) {
  try {
    const {
      companyName,
      contactNumber,
      panNo,
      companyLocation,
      companyDescription,
      companyWebsite,
      companyLogo,
      companyDocument,
    } = req.body;

    // Only allow updating these fields — never role, email, password, isVerified
    const allowedUpdates = {
      ...(companyName && { companyName }),
      ...(contactNumber && { contactNumber }),
      ...(panNo && { panNo }),
      ...(companyLocation && { companyLocation }),
      ...(companyDescription && { companyDescription }),
      ...(companyWebsite && { companyWebsite }),
      ...(companyLogo && { companyLogo }),
      ...(companyDocument && { companyDocument }),
    };

    if (Object.keys(allowedUpdates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided to update",
      });
    }

    const updated = await User.findByIdAndUpdate(
      req.user.id,
      { $set: allowedUpdates },
      { new: true, runValidators: true },
    ).select(
      "-password -otpHash -otpExpires -resetTokenHash -resetTokenExpires",
    );

    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
}

module.exports = { getProfile, updateProfile };
