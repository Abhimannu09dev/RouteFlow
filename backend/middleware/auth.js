import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

const auth = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(403).json({ success: false, message: "Account deactivated" });
    }

    req.user = {
      id: decoded.id,
      role: decoded.role,
      isAccountVerified: user.isAccountVerified,
    };
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid token or expired" });
  }
};

const rolecheck = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden: Insufficient role" });
    }
    next();
  };
};

const requireVerification = (req, res, next) => {
  if (!req.user.isAccountVerified) {
    return res.status(403).json({
      success: false,
      message: "Your account must be verified by admin before performing this action",
    });
  }
  next();
};

export { auth, rolecheck, requireVerification };
