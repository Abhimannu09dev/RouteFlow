import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import User from "../models/userModel.js";
import type { UserRole, AuthUser } from "../types/index.js";

interface JwtPayload {
  id: number;
  role: UserRole;
}

export const auth = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.cookies.token as string | undefined;

  if (!token) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env["JWT_SECRET"] as string) as JwtPayload;

    const user = User.findById(decoded.id);
    if (!user?.isActive) {
      res.status(403).json({ success: false, message: "Account deactivated" });
      return;
    }

    req.user = {
      id: decoded.id,
      role: decoded.role,
      isAccountVerified: user.isAccountVerified,
    } satisfies AuthUser;
    next();
  } catch {
    res.status(401).json({ success: false, message: "Invalid token or expired" });
  }
};

export const rolecheck = (roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: "Forbidden: Insufficient role" });
      return;
    }
    next();
  };
};

export const requireVerification = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user.isAccountVerified) {
    res.status(403).json({
      success: false,
      message: "Your account must be verified by admin before performing this action",
    });
    return;
  }
  next();
};
