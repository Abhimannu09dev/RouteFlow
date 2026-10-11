import db from "../db/database.js";

const TICKET_JOIN = `
  SELECT st.*, u.company_name AS user_company_name, u.email AS user_email, u.role AS user_role
  FROM support_ticket st
  LEFT JOIN user u ON st.user_id = u.id
`;

function fromRow(row) {
  if (!row) return null;
  return {
    _id: row.id, id: row.id,
    userId: row.user_id,
    subject: row.subject,
    message: row.message,
    category: row.category,
    status: row.status,
    adminReply: row.admin_reply ?? null,
    repliedAt: row.replied_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    user: row.user_company_name ? {
      _id: row.user_id, id: row.user_id,
      companyName: row.user_company_name,
      email: row.user_email ?? null,
      role: row.user_role ?? null,
    } : undefined,
  };
}

const SupportTicket = {
  findById(id) {
    const row = db.prepare(`${TICKET_JOIN} WHERE st.id = ?`).get(id);
    return fromRow(row);
  },

  find({ userId, status, category } = {}, { sort = "st.created_at DESC", limit = 10, skip = 0 } = {}) {
    const where = [];
    const params = [];
    if (userId !== undefined) { where.push("st.user_id = ?"); params.push(userId); }
    if (status) { where.push("st.status = ?"); params.push(status); }
    if (category) { where.push("st.category = ?"); params.push(category); }
    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const rows = db.prepare(`${TICKET_JOIN} ${whereClause} ORDER BY ${sort} LIMIT ? OFFSET ?`).all(...params, limit, skip);
    return rows.map(fromRow);
  },

  count({ userId, status, category } = {}) {
    const where = [];
    const params = [];
    if (userId !== undefined) { where.push("user_id = ?"); params.push(userId); }
    if (status) { where.push("status = ?"); params.push(status); }
    if (category) { where.push("category = ?"); params.push(category); }
    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    return db.prepare(`SELECT COUNT(*) as n FROM support_ticket ${whereClause}`).get(...params).n;
  },

  create(data) {
    const now = new Date().toISOString();
    const info = db.prepare(`
      INSERT INTO support_ticket (user_id, subject, message, category, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(data.userId, data.subject, data.message, data.category, data.status || "open", now, now);
    return SupportTicket.findById(info.lastInsertRowid);
  },

  update(id, data) {
    const sets = [];
    const params = [];
    const map = { status: "status", adminReply: "admin_reply", repliedAt: "replied_at" };
    for (const [k, col] of Object.entries(map)) {
      if (k in data) { sets.push(`${col} = ?`); params.push(data[k] ?? null); }
    }
    if (sets.length === 0) return SupportTicket.findById(id);
    sets.push("updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')");
    params.push(id);
    db.prepare(`UPDATE support_ticket SET ${sets.join(", ")} WHERE id = ?`).run(...params);
    return SupportTicket.findById(id);
  },
};

export default SupportTicket;
