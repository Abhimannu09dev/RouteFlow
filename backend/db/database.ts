import Database, { type Database as DatabaseType } from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env["DB_PATH"] ?? path.join(__dirname, "../data/routeflow.db");

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db: DatabaseType = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.pragma("synchronous = NORMAL");

db.exec(`
CREATE TABLE IF NOT EXISTS user (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'logistics' CHECK (role IN ('logistics','manufacturer','admin')),
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  contact_number TEXT,
  pan_no TEXT,
  company_location TEXT,
  company_description TEXT,
  company_logo TEXT,
  company_website TEXT,
  is_verified INTEGER NOT NULL DEFAULT 0 CHECK (is_verified IN (0,1)),
  is_account_verified INTEGER NOT NULL DEFAULT 0 CHECK (is_account_verified IN (0,1)),
  submitted_for_verification INTEGER NOT NULL DEFAULT 0 CHECK (submitted_for_verification IN (0,1)),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  rejection_reason TEXT,
  otp_hash TEXT,
  otp_expires TEXT,
  reset_token_hash TEXT,
  reset_token_expires TEXT,
  notif_pref_email INTEGER NOT NULL DEFAULT 1 CHECK (notif_pref_email IN (0,1)),
  notif_pref_order_status INTEGER NOT NULL DEFAULT 1 CHECK (notif_pref_order_status IN (0,1)),
  notif_pref_bid_updates INTEGER NOT NULL DEFAULT 1 CHECK (notif_pref_bid_updates IN (0,1)),
  notif_pref_new_order_alerts INTEGER NOT NULL DEFAULT 1 CHECK (notif_pref_new_order_alerts IN (0,1)),
  notif_pref_chat_messages INTEGER NOT NULL DEFAULT 1 CHECK (notif_pref_chat_messages IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS user_document (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE ON UPDATE CASCADE,
  type TEXT NOT NULL,
  label TEXT,
  filename TEXT NOT NULL,
  url TEXT NOT NULL,
  uploaded_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS "order" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL UNIQUE,
  manufacturer_id INTEGER NOT NULL REFERENCES user(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  logistics_id INTEGER REFERENCES user(id) ON DELETE SET NULL ON UPDATE CASCADE,
  product_details TEXT,
  vehicle_type TEXT,
  route_from TEXT,
  route_to TEXT,
  additional_info TEXT,
  quantity REAL NOT NULL,
  weight REAL NOT NULL,
  expected_price REAL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','in transit','delivered','cancelled')),
  invoice_needed INTEGER NOT NULL DEFAULT 0 CHECK (invoice_needed IN (0,1)),
  vat_bill_needed INTEGER NOT NULL DEFAULT 0 CHECK (vat_bill_needed IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS order_document (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES "order"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('invoice','vat_bill')),
  url TEXT NOT NULL,
  uploaded_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS price_offer (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES "order"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  logistics_id INTEGER NOT NULL REFERENCES user(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  proposed_price REAL NOT NULL CHECK (proposed_price >= 1),
  estimated_delivery_days INTEGER NOT NULL CHECK (estimated_delivery_days >= 1),
  currency TEXT NOT NULL DEFAULT 'NPR',
  note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','withdrawn')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (order_id, logistics_id)
);

CREATE TABLE IF NOT EXISTS payment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES "order"(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  payer_id INTEGER NOT NULL REFERENCES user(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  receiver_id INTEGER NOT NULL REFERENCES user(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  amount REAL NOT NULL,
  gateway TEXT NOT NULL CHECK (gateway IN ('khalti','esewa')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed')),
  pidx TEXT,
  ref_id TEXT,
  transaction_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS message (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES "order"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES user(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  receiver_id INTEGER NOT NULL REFERENCES user(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  file_url TEXT,
  file_name TEXT,
  file_type TEXT CHECK (file_type IN ('image','document')),
  is_read INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS notification (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipient_id INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE ON UPDATE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('new_bid','bid_accepted','bid_rejected','order_accepted','new_order','status_update')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  order_id INTEGER REFERENCES "order"(id) ON DELETE SET NULL ON UPDATE CASCADE,
  is_read INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS support_ticket (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE ON UPDATE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('general','technical','billing')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in-progress','resolved')),
  admin_reply TEXT,
  replied_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_user_role_is_active ON user (role, is_active);
CREATE INDEX IF NOT EXISTS idx_user_role ON user (role);
CREATE INDEX IF NOT EXISTS idx_user_verification ON user (is_account_verified, submitted_for_verification);
CREATE INDEX IF NOT EXISTS idx_user_reset_token ON user (reset_token_hash, reset_token_expires) WHERE reset_token_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_otp ON user (otp_hash) WHERE otp_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_document_user_id ON user_document (user_id);
CREATE INDEX IF NOT EXISTS idx_order_manufacturer_id ON "order" (manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_order_logistics_id ON "order" (logistics_id);
CREATE INDEX IF NOT EXISTS idx_order_status ON "order" (status);
CREATE INDEX IF NOT EXISTS idx_order_status_logistics ON "order" (status, logistics_id);
CREATE INDEX IF NOT EXISTS idx_order_created_at ON "order" (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_document_order_id ON order_document (order_id);
CREATE INDEX IF NOT EXISTS idx_price_offer_logistics_id ON price_offer (logistics_id);
CREATE INDEX IF NOT EXISTS idx_price_offer_status ON price_offer (status);
CREATE INDEX IF NOT EXISTS idx_payment_order_id ON payment (order_id);
CREATE INDEX IF NOT EXISTS idx_payment_payer_id ON payment (payer_id);
CREATE INDEX IF NOT EXISTS idx_payment_receiver_id ON payment (receiver_id);
CREATE INDEX IF NOT EXISTS idx_message_order_created ON message (order_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_message_receiver_is_read ON message (receiver_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notification_recipient ON notification (recipient_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_order_id ON notification (order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_support_ticket_user ON support_ticket (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_ticket_status ON support_ticket (status);
CREATE INDEX IF NOT EXISTS idx_support_ticket_category ON support_ticket (category);
`);

export default db;
