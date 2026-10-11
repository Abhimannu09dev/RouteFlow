import type { ParsedQs } from "qs";

export const parsePagination = (query: ParsedQs): { page: number; limit: number; skip: number } => {
  const rawPage = query["page"];
  const rawLimit = query["limit"];
  const page = Math.max(1, parseInt(typeof rawPage === "string" ? rawPage : "", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(typeof rawLimit === "string" ? rawLimit : "", 10) || 10));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

export const buildPaginationMeta = (
  total: number,
  page: number,
  limit: number,
): { total: number; page: number; limit: number; totalPages: number } => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
});
