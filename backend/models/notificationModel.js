import db from "../db/database.js";

function fromRow(row) {
  if (!row) return null;
  return {
    _id: row.id, id: row.id,
    recipient: row.recipient_id,
    type: row.type,
    title: row.title,
    message: row.message,
    orderId: row.order_id ?? null,
    isRead: row.is_read === 1,
    createdAt: row.created_at,
  };
}

const Notification = {
  findById(id) {
    const row = db.prepare("SELECT * FROM notification WHERE id = ?").get(id);
    return fromRow(row);
  },

  find({ recipientId } = {}, { limit = 50 } = {}) {
    const rows = db.prepare("SELECT * FROM notification WHERE recipient_id = ? ORDER BY created_at DESC LIMIT ?").all(recipientId, limit);
    return rows.map(fromRow);
  },

  countUnread(recipientId) {
    return db.prepare("SELECT COUNT(*) as n FROM notification WHERE recipient_id = ? AND is_read = 0").get(recipientId).n;
  },

  markRead(id, recipientId) {
    db.prepare("UPDATE notification SET is_read = 1 WHERE id = ? AND recipient_id = ?").run(id, recipientId);
  },

  markAllRead(recipientId) {
    db.prepare("UPDATE notification SET is_read = 1 WHERE recipient_id = ? AND is_read = 0").run(recipientId);
  },

  create(data) {
    const now = new Date().toISOString();
    const info = db.prepare(`
      INSERT INTO notification (recipient_id, type, title, message, order_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(data.recipientId, data.type, data.title, data.message, data.orderId ?? null, now);
    return Notification.findById(info.lastInsertRowid);
  },
};

export default Notification;
