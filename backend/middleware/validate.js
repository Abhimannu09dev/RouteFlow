import { ZodError } from "zod";

/**
 * Returns an Express middleware that validates req[target] against the
 * provided Zod schema. On success, req[target] is replaced with the
 * parsed (coerced + stripped) data. On failure, responds 400 with the
 * first error message./
 *
 * @param {import("zod").ZodTypeAny} schema
 * @param {"body"|"query"|"params"} target
 */
const validate =
  (schema, target = "body") =>
  (req, res, next) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      const message = result.error.issues?.[0]?.message || "Validation failed";
      return res.status(400).json({ success: false, message });
    }
    req[target] = result.data; // replace with coerced + stripped data
    next();
  };

export default validate;
