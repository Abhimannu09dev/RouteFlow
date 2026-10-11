import db from "../db/database.js";

const MSG_JOIN = `
  SELECT m.*, s.company_name AS sender_company_name, s.email AS sender_email, s.role AS sender_role
  FROM message m
  LEFT JOIN user s ON m.sender_id = s.id
`;

function fromRow(row) {
  if (!row) return null;
  return {
    _id: row.id, id: row.id,
    orderId: row.order_id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    content: row.content,
    fileUrl: row.file_url ?? null,
    fileName: row.file_name ?? null,
    fileType: row.file_type ?? null,
    isRead: row.is_read === 1,
    createdAt: row.created_at,
    sender: row.sender_company_name ? {
      _id: row.sender_id, id: row.sender_id,
      companyName: row.sender_company_name,
      email: row.sender_email ?? null,
      role: row.sender_role ?? null,
    } : undefined,
  };
}

const Message = {
  findByOrderId(orderId) {
    const rows = db.prepare(`${MSG_JOIN} WHERE m.order_id = ? ORDER BY m.created_at ASC`).all(orderId);
    return rows.map(fromRow);
  },

  markRead(orderId, receiverId) {
    db.prepare("UPDATE message SET is_read = 1 WHERE order_id = ? AND receiver_id = ? AND is_read = 0").run(orderId, receiverId);
  },

  countUnread(receiverId) {
    return db.prepare("SELECT COUNT(*) as n FROM message WHERE receiver_id = ? AND is_read = 0").get(receiverId).n;
  },

  unreadByOrder(receiverId) {
    const rows = db.prepare("SELECT order_id, COUNT(*) as count FROM message WHERE receiver_id = ? AND is_read = 0 GROUP BY order_id").all(receiverId);
    return new Map(rows.map(r => [r.order_id, r.count]));
  },

  create(data) {
    const now = new Date().toISOString();
    const info = db.prepare(`
      INSERT INTO message (order_id, sender_id, receiver_id, content, file_url, file_name, file_type, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(data.orderId, data.senderId, data.receiverId, data.content || "", data.fileUrl ?? null, data.fileName ?? null, data.fileType ?? null, now);
    const row = db.prepare(`${MSG_JOIN} WHERE m.id = ?`).get(info.lastInsertRowid);
    return fromRow(row);
  },
};

export default Message;
