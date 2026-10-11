import db from "../db/database.js";
import type { Message, MessageFileType } from "../types/index.js";

interface MessageRow {
  id: number;
  order_id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  file_url: string | null;
  file_name: string | null;
  file_type: MessageFileType | null;
  is_read: number;
  created_at: string;
  // join columns
  sender_company_name: string | null;
  sender_email: string | null;
  sender_role: string | null;
}

interface CreateMessageData {
  orderId: number;
  senderId: number;
  receiverId: number;
  content?: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: MessageFileType | null;
}

const MSG_JOIN = `
  SELECT m.*, s.company_name AS sender_company_name, s.email AS sender_email, s.role AS sender_role
  FROM message m
  LEFT JOIN user s ON m.sender_id = s.id
`;

function fromRow(row: MessageRow | undefined): Message | null {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    orderId: row.order_id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    content: row.content,
    fileUrl: row.file_url ?? null,
    fileName: row.file_name ?? null,
    fileType: row.file_type ?? null,
    isRead: row.is_read === 1,
    createdAt: row.created_at,
    sender: row.sender_company_name
      ? {
          _id: row.sender_id,
          id: row.sender_id,
          companyName: row.sender_company_name,
          email: row.sender_email ?? null,
          role: row.sender_role ?? null,
        }
      : undefined,
  };
}

const MessageModel = {
  findByOrderId(orderId: number): Message[] {
    const rows = db
      .prepare(`${MSG_JOIN} WHERE m.order_id = ? ORDER BY m.created_at ASC`)
      .all(orderId) as MessageRow[];
    return rows.map((r) => fromRow(r) as Message);
  },

  markRead(orderId: number, receiverId: number): void {
    db.prepare(
      "UPDATE message SET is_read = 1 WHERE order_id = ? AND receiver_id = ? AND is_read = 0",
    ).run(orderId, receiverId);
  },

  countUnread(receiverId: number): number {
    const row = db
      .prepare("SELECT COUNT(*) as n FROM message WHERE receiver_id = ? AND is_read = 0")
      .get(receiverId) as { n: number };
    return row.n;
  },

  unreadByOrder(receiverId: number): Map<number, number> {
    const rows = db
      .prepare(
        "SELECT order_id, COUNT(*) as count FROM message WHERE receiver_id = ? AND is_read = 0 GROUP BY order_id",
      )
      .all(receiverId) as { order_id: number; count: number }[];
    return new Map(rows.map((r) => [r.order_id, r.count]));
  },

  create(data: CreateMessageData): Message | null {
    const now = new Date().toISOString();
    const info = db
      .prepare(
        `INSERT INTO message (order_id, sender_id, receiver_id, content, file_url, file_name, file_type, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        data.orderId,
        data.senderId,
        data.receiverId,
        data.content ?? "",
        data.fileUrl ?? null,
        data.fileName ?? null,
        data.fileType ?? null,
        now,
      );
    const row = db
      .prepare(`${MSG_JOIN} WHERE m.id = ?`)
      .get(info.lastInsertRowid) as MessageRow | undefined;
    return fromRow(row);
  },
};

export default MessageModel;
