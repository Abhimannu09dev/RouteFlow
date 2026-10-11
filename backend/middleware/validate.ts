import type { Request, Response, NextFunction } from "express";
import { z } from "zod";

type RequestTarget = "body" | "query" | "params";

const validate =
  (schema: z.ZodType, target: RequestTarget = "body") =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      const message = result.error.issues[0]?.message ?? "Validation failed";
      res.status(400).json({ success: false, message });
      return;
    }
    // replace with coerced + stripped data — casting through unknown to write to req
    (req as unknown as Record<string, unknown>)[target] = result.data;
    next();
  };

export default validate;
