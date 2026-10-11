import db from "../db/database.js";
import type { SupportTicket, TicketCategory, TicketStatus } from "../types/index.js";

interface TicketRow {
  id: number;
  user_id: number;
  subject: string;
  message: string;
  category: TicketCategory;
  status: TicketStatus;
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
  updated_at: string;
  // join columns
  user_company_name: string | null;
  user_email: string | null;
  user_role: string | null;
}

interface FindOptions {
  userId?: number;
  status?: TicketStatus;
  category?: TicketCategory;
}

interface FindPagination {
  sort?: string;
  limit?: number;
  skip?: number;
}

interface CreateTicketData {
  userId: number;
  subject: string;
  message: string;
  category: TicketCategory;
  status?: TicketStatus;
}

type UpdateTicketData = Partial<{
  status: TicketStatus;
  adminReply: string | null;
  repliedAt: string | null;
}>;

const TICKET_JOIN = `
  SELECT st.*, u.company_name AS user_company_name, u.email AS user_email, u.role AS user_role
  FROM support_ticket st
  LEFT JOIN user u ON st.user_id = u.id
`;

function fromRow(row: TicketRow | undefined): SupportTicket | null {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    userId: row.user_id,
    subject: row.subject,
    message: row.message,
    category: row.category,
    status: row.status,
    adminReply: row.admin_reply ?? null,
    repliedAt: row.replied_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    user: row.user_company_name
      ? {
          _id: row.user_id,
          id: row.user_id,
          companyName: row.user_company_name,
          email: row.user_email ?? null,
          role: row.user_role ?? null,
        }
      : undefined,
  };
}

const SupportTicketModel = {
  findById(id: number): SupportTicket | null {
    const row = db
      .prepare(`${TICKET_JOIN} WHERE st.id = ?`)
      .get(id) as TicketRow | undefined;
    return fromRow(row);
  },

  find(
    { userId, status, category }: FindOptions = {},
    { sort = "st.created_at DESC", limit = 10, skip = 0 }: FindPagination = {},
  ): SupportTicket[] {
    const where: string[] = [];
    const params: unknown[] = [];
    if (userId !== undefined) { where.push("st.user_id = ?"); params.push(userId); }
    if (status) { where.push("st.status = ?"); params.push(status); }
    if (category) { where.push("st.category = ?"); params.push(category); }
    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const rows = db
      .prepare(`${TICKET_JOIN} ${whereClause} ORDER BY ${sort} LIMIT ? OFFSET ?`)
      .all(...params, limit, skip) as TicketRow[];
    return rows.map((r) => fromRow(r) as SupportTicket);
  },

  count({ userId, status, category }: FindOptions = {}): number {
    const where: string[] = [];
    const params: unknown[] = [];
    if (userId !== undefined) { where.push("user_id = ?"); params.push(userId); }
    if (status) { where.push("status = ?"); params.push(status); }
    if (category) { where.push("category = ?"); params.push(category); }
    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const result = db
      .prepare(`SELECT COUNT(*) as n FROM support_ticket ${whereClause}`)
      .get(...params) as { n: number };
    return result.n;
  },

  create(data: CreateTicketData): SupportTicket | null {
    const now = new Date().toISOString();
    const info = db
      .prepare(
        `INSERT INTO support_ticket (user_id, subject, message, category, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(data.userId, data.subject, data.message, data.category, data.status ?? "open", now, now);
    return SupportTicketModel.findById(info.lastInsertRowid as number);
  },

  update(id: number, data: UpdateTicketData): SupportTicket | null {
    const sets: string[] = [];
    const params: unknown[] = [];
    const map: Record<string, string> = {
      status: "status",
      adminReply: "admin_reply",
      repliedAt: "replied_at",
    };
    const dataRecord = data as Record<string, unknown>;
    for (const [k, col] of Object.entries(map)) {
      if (k in dataRecord) { sets.push(`${col} = ?`); params.push(dataRecord[k] ?? null); }
    }
    if (sets.length === 0) return SupportTicketModel.findById(id);
    sets.push("updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')");
    params.push(id);
    db.prepare(`UPDATE support_ticket SET ${sets.join(", ")} WHERE id = ?`).run(...params);
    return SupportTicketModel.findById(id);
  },
};

export default SupportTicketModel;
