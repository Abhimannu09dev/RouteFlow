import db from "../db/database.js";
import type { Notification, NotificationType } from "../types/index.js";

interface NotificationRow {
  id: number;
  recipient_id: number;
  type: NotificationType;
  title: string;
  message: string;
  order_id: number | null;
  is_read: number;
  created_at: string;
}

interface CreateNotificationData {
  recipientId: number;
  type: NotificationType;
  title: string;
  message: string;
  orderId?: number | null;
}

function fromRow(row: NotificationRow | undefined): Notification | null {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    recipient: row.recipient_id,
    type: row.type,
    title: row.title,
    message: row.message,
    orderId: row.order_id ?? null,
    isRead: row.is_read === 1,
    createdAt: row.created_at,
  };
}

const NotificationModel = {
  findById(id: number): Notification | null {
    const row = db
      .prepare("SELECT * FROM notification WHERE id = ?")
      .get(id) as NotificationRow | undefined;
    return fromRow(row);
  },

  find({ recipientId }: { recipientId: number }, { limit = 50 }: { limit?: number } = {}): Notification[] {
    const rows = db
      .prepare(
        "SELECT * FROM notification WHERE recipient_id = ? ORDER BY created_at DESC LIMIT ?",
      )
      .all(recipientId, limit) as NotificationRow[];
    return rows.map((r) => fromRow(r) as Notification);
  },

  countUnread(recipientId: number): number {
    const row = db
      .prepare("SELECT COUNT(*) as n FROM notification WHERE recipient_id = ? AND is_read = 0")
      .get(recipientId) as { n: number };
    return row.n;
  },

  markRead(id: number, recipientId: number): void {
    db.prepare(
      "UPDATE notification SET is_read = 1 WHERE id = ? AND recipient_id = ?",
    ).run(id, recipientId);
  },

  markAllRead(recipientId: number): void {
    db.prepare(
      "UPDATE notification SET is_read = 1 WHERE recipient_id = ? AND is_read = 0",
    ).run(recipientId);
  },

  create(data: CreateNotificationData): Notification | null {
    const now = new Date().toISOString();
    const info = db
      .prepare(
        `INSERT INTO notification (recipient_id, type, title, message, order_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(data.recipientId, data.type, data.title, data.message, data.orderId ?? null, now);
    return NotificationModel.findById(info.lastInsertRowid as number);
  },
};

export default NotificationModel;
