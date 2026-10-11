import db from "../db/database.js";
import type {
  User,
  UserWithPassword,
  UserDocument,
  UserRole,
  NotificationPreferences,
} from "../types/index.js";

interface UserRow {
  id: number;
  company_name: string;
  role: UserRole;
  email: string;
  password: string;
  contact_number: string | null;
  pan_no: string | null;
  company_location: string | null;
  company_description: string | null;
  company_logo: string | null;
  company_website: string | null;
  is_verified: number;
  is_account_verified: number;
  submitted_for_verification: number;
  is_active: number;
  rejection_reason: string | null;
  otp_hash: string | null;
  otp_expires: string | null;
  reset_token_hash: string | null;
  reset_token_expires: string | null;
  notif_pref_email: number;
  notif_pref_order_status: number;
  notif_pref_bid_updates: number;
  notif_pref_new_order_alerts: number;
  notif_pref_chat_messages: number;
  created_at: string;
  updated_at: string;
}

interface UserDocRow {
  id: number;
  user_id: number;
  type: string;
  label: string | null;
  filename: string;
  url: string;
  uploaded_at: string;
}

interface FindAllOptions {
  role?: UserRole;
  roleNe?: UserRole;
  isActive?: boolean;
  isAccountVerified?: boolean;
  submittedForVerification?: boolean;
  hasRejectionReason?: boolean;
  search?: string;
}

interface FindAllPagination {
  sort?: string;
  limit?: number;
  skip?: number;
}

interface CreateUserData {
  companyName: string;
  email: string;
  role?: UserRole;
  password: string;
  isVerified?: boolean;
  otpHash?: string | null;
  otpExpires?: Date | string | null;
}

type UpdateUserData = Partial<{
  companyName: string;
  role: UserRole;
  email: string;
  password: string;
  contactNumber: string | null;
  panNo: string | null;
  companyLocation: string | null;
  companyDescription: string | null;
  companyLogo: string | null;
  companyWebsite: string | null;
  isVerified: boolean;
  isAccountVerified: boolean;
  submittedForVerification: boolean;
  isActive: boolean;
  rejectionReason: string | null;
  otpHash: string | null;
  otpExpires: Date | string | null;
  resetTokenHash: string | null;
  resetTokenExpires: Date | string | null;
  "notificationPreferences.emailNotifications": boolean;
  "notificationPreferences.orderStatusUpdates": boolean;
  "notificationPreferences.bidUpdates": boolean;
  "notificationPreferences.newOrderAlerts": boolean;
  "notificationPreferences.chatMessages": boolean;
}>;

interface AddDocumentData {
  type: string;
  label?: string | null;
  filename: string;
  url: string;
  uploadedAt?: string;
}

function fromRow(row: UserRow | undefined): User | null {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    companyName: row.company_name,
    role: row.role,
    email: row.email,
    contactNumber: row.contact_number ?? null,
    panNo: row.pan_no ?? null,
    companyLocation: row.company_location ?? null,
    companyDescription: row.company_description ?? null,
    companyLogo: row.company_logo ?? null,
    companyWebsite: row.company_website ?? null,
    isVerified: row.is_verified === 1,
    isAccountVerified: row.is_account_verified === 1,
    submittedForVerification: row.submitted_for_verification === 1,
    isActive: row.is_active === 1,
    rejectionReason: row.rejection_reason ?? null,
    otpHash: row.otp_hash ?? null,
    otpExpires: row.otp_expires ? new Date(row.otp_expires) : null,
    resetTokenHash: row.reset_token_hash ?? null,
    resetTokenExpires: row.reset_token_expires ? new Date(row.reset_token_expires) : null,
    notificationPreferences: {
      emailNotifications: row.notif_pref_email === 1,
      orderStatusUpdates: row.notif_pref_order_status === 1,
      bidUpdates: row.notif_pref_bid_updates === 1,
      newOrderAlerts: row.notif_pref_new_order_alerts === 1,
      chatMessages: row.notif_pref_chat_messages === 1,
    } satisfies NotificationPreferences,
    documents: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function fromRowWithPassword(row: UserRow | undefined): UserWithPassword | null {
  if (!row) return null;
  const u = fromRow(row);
  if (!u) return null;
  return { ...u, password: row.password };
}

function docFromRow(row: UserDocRow | undefined): UserDocument | null {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    type: row.type,
    label: row.label ?? null,
    filename: row.filename,
    url: row.url,
    uploadedAt: row.uploaded_at,
  };
}

const UserModel = {
  findById(id: number): User | null {
    const row = db.prepare("SELECT * FROM user WHERE id = ?").get(id) as UserRow | undefined;
    return fromRow(row);
  },

  findByIdWithPassword(id: number): UserWithPassword | null {
    const row = db.prepare("SELECT * FROM user WHERE id = ?").get(id) as UserRow | undefined;
    return fromRowWithPassword(row);
  },

  findByEmail(email: string): UserWithPassword | null {
    const row = db.prepare("SELECT * FROM user WHERE email = ?").get(email) as UserRow | undefined;
    return fromRowWithPassword(row);
  },

  findByResetToken(hash: string): UserWithPassword | null {
    const row = db
      .prepare(
        "SELECT * FROM user WHERE reset_token_hash = ? AND reset_token_expires > strftime('%Y-%m-%dT%H:%M:%fZ','now')",
      )
      .get(hash) as UserRow | undefined;
    return fromRowWithPassword(row);
  },

  findAll(
    {
      role,
      roleNe,
      isActive,
      isAccountVerified,
      submittedForVerification,
      hasRejectionReason,
      search,
    }: FindAllOptions = {},
    { sort = "created_at DESC", limit = 100, skip = 0 }: FindAllPagination = {},
  ): User[] {
    const where: string[] = [];
    const params: unknown[] = [];

    if (role) { where.push("role = ?"); params.push(role); }
    if (roleNe) { where.push("role != ?"); params.push(roleNe); }
    if (isActive !== undefined) { where.push("is_active = ?"); params.push(isActive ? 1 : 0); }
    if (isAccountVerified !== undefined) { where.push("is_account_verified = ?"); params.push(isAccountVerified ? 1 : 0); }
    if (submittedForVerification !== undefined) { where.push("submitted_for_verification = ?"); params.push(submittedForVerification ? 1 : 0); }
    if (hasRejectionReason === true) { where.push("rejection_reason IS NOT NULL AND is_account_verified = 0"); }
    if (search) {
      where.push("(LOWER(company_name) LIKE ? OR LOWER(email) LIKE ?)");
      const q = `%${search.toLowerCase()}%`;
      params.push(q, q);
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const rows = db
      .prepare(`SELECT * FROM user ${whereClause} ORDER BY ${sort} LIMIT ? OFFSET ?`)
      .all(...params, limit, skip) as UserRow[];
    return rows.map((r) => fromRow(r) as User);
  },

  count({
    role,
    roleNe,
    isActive,
    isAccountVerified,
    submittedForVerification,
    hasRejectionReason,
    search,
  }: FindAllOptions = {}): number {
    const where: string[] = [];
    const params: unknown[] = [];

    if (role) { where.push("role = ?"); params.push(role); }
    if (roleNe) { where.push("role != ?"); params.push(roleNe); }
    if (isActive !== undefined) { where.push("is_active = ?"); params.push(isActive ? 1 : 0); }
    if (isAccountVerified !== undefined) { where.push("is_account_verified = ?"); params.push(isAccountVerified ? 1 : 0); }
    if (submittedForVerification !== undefined) { where.push("submitted_for_verification = ?"); params.push(submittedForVerification ? 1 : 0); }
    if (hasRejectionReason === true) { where.push("rejection_reason IS NOT NULL AND is_account_verified = 0"); }
    if (search) {
      where.push("(LOWER(company_name) LIKE ? OR LOWER(email) LIKE ?)");
      const q = `%${search.toLowerCase()}%`;
      params.push(q, q);
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const result = db
      .prepare(`SELECT COUNT(*) as n FROM user ${whereClause}`)
      .get(...params) as { n: number };
    return result.n;
  },

  create(data: CreateUserData): User | null {
    const now = new Date().toISOString();
    const info = db
      .prepare(
        `INSERT INTO user (company_name, role, email, password, is_verified, otp_hash, otp_expires, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        data.companyName,
        data.role ?? "logistics",
        data.email,
        data.password,
        data.isVerified ? 1 : 0,
        data.otpHash ?? null,
        data.otpExpires ? new Date(data.otpExpires).toISOString() : null,
        now,
        now,
      );
    return UserModel.findById(info.lastInsertRowid as number);
  },

  update(id: number, data: UpdateUserData): User | null {
    const sets: string[] = [];
    const params: unknown[] = [];
    const boolCols = new Set([
      "is_verified", "is_account_verified", "submitted_for_verification", "is_active",
      "notif_pref_email", "notif_pref_order_status", "notif_pref_bid_updates",
      "notif_pref_new_order_alerts", "notif_pref_chat_messages",
    ]);
    const dateCols = new Set(["otp_expires", "reset_token_expires"]);
    const fieldMap: Record<string, string> = {
      companyName: "company_name", role: "role", email: "email", password: "password",
      contactNumber: "contact_number", panNo: "pan_no", companyLocation: "company_location",
      companyDescription: "company_description", companyLogo: "company_logo",
      companyWebsite: "company_website", isVerified: "is_verified",
      isAccountVerified: "is_account_verified", submittedForVerification: "submitted_for_verification",
      isActive: "is_active", rejectionReason: "rejection_reason",
      otpHash: "otp_hash", otpExpires: "otp_expires",
      resetTokenHash: "reset_token_hash", resetTokenExpires: "reset_token_expires",
      "notificationPreferences.emailNotifications": "notif_pref_email",
      "notificationPreferences.orderStatusUpdates": "notif_pref_order_status",
      "notificationPreferences.bidUpdates": "notif_pref_bid_updates",
      "notificationPreferences.newOrderAlerts": "notif_pref_new_order_alerts",
      "notificationPreferences.chatMessages": "notif_pref_chat_messages",
    };

    const dataRecord = data as Record<string, unknown>;
    for (const [jsKey, colName] of Object.entries(fieldMap)) {
      if (jsKey in dataRecord) {
        let val: unknown = dataRecord[jsKey];
        if (boolCols.has(colName)) val = val ? 1 : 0;
        if (dateCols.has(colName)) val = val ? new Date(val as string).toISOString() : null;
        sets.push(`${colName} = ?`);
        params.push(val);
      }
    }

    if (sets.length === 0) return UserModel.findById(id);
    sets.push("updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')");
    params.push(id);
    db.prepare(`UPDATE user SET ${sets.join(", ")} WHERE id = ?`).run(...params);
    return UserModel.findById(id);
  },

  findWithDocuments(id: number): User | null {
    const user = UserModel.findById(id);
    if (!user) return null;
    user.documents = UserModel.getDocuments(id);
    return user;
  },

  getDocuments(userId: number): UserDocument[] {
    const rows = db
      .prepare("SELECT * FROM user_document WHERE user_id = ? ORDER BY uploaded_at ASC")
      .all(userId) as UserDocRow[];
    return rows.map((r) => docFromRow(r) as UserDocument);
  },

  addDocument(userId: number, doc: AddDocumentData): UserDocument | null {
    const info = db
      .prepare(
        `INSERT INTO user_document (user_id, type, label, filename, url, uploaded_at) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        userId,
        doc.type,
        doc.label ?? null,
        doc.filename,
        doc.url,
        doc.uploadedAt ?? new Date().toISOString(),
      );
    const row = db
      .prepare("SELECT * FROM user_document WHERE id = ?")
      .get(info.lastInsertRowid) as UserDocRow | undefined;
    return docFromRow(row);
  },

  deleteDocument(documentId: number): boolean {
    const result = db.prepare("DELETE FROM user_document WHERE id = ?").run(documentId);
    return result.changes > 0;
  },

  getDocumentById(documentId: number): UserDocument | null {
    const row = db
      .prepare("SELECT * FROM user_document WHERE id = ?")
      .get(documentId) as UserDocRow | undefined;
    return docFromRow(row);
  },
};

export default UserModel;
