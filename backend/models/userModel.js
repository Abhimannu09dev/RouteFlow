import db from "../db/database.js";

function fromRow(row) {
  if (!row) return null;
  return {
    _id: row.id, id: row.id,
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
    },
    documents: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function fromRowWithPassword(row) {
  const u = fromRow(row);
  if (!u) return null;
  u.password = row.password;
  return u;
}

function docFromRow(row) {
  if (!row) return null;
  return {
    _id: row.id, id: row.id,
    type: row.type,
    label: row.label ?? null,
    filename: row.filename,
    url: row.url,
    uploadedAt: row.uploaded_at,
  };
}

const User = {
  findById(id) {
    const row = db.prepare("SELECT * FROM user WHERE id = ?").get(id);
    return fromRow(row);
  },

  findByIdWithPassword(id) {
    const row = db.prepare("SELECT * FROM user WHERE id = ?").get(id);
    return fromRowWithPassword(row);
  },

  findByEmail(email) {
    const row = db.prepare("SELECT * FROM user WHERE email = ?").get(email);
    return fromRowWithPassword(row);
  },

  findByResetToken(hash) {
    const row = db.prepare(
      "SELECT * FROM user WHERE reset_token_hash = ? AND reset_token_expires > strftime('%Y-%m-%dT%H:%M:%fZ','now')"
    ).get(hash);
    return fromRowWithPassword(row);
  },

  findAll({ role, roleNe, isActive, isAccountVerified, submittedForVerification, hasRejectionReason, search } = {}, { sort = "created_at DESC", limit = 100, skip = 0 } = {}) {
    const where = [];
    const params = [];

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
    const rows = db.prepare(`SELECT * FROM user ${whereClause} ORDER BY ${sort} LIMIT ? OFFSET ?`).all(...params, limit, skip);
    return rows.map(fromRow);
  },

  count({ role, roleNe, isActive, isAccountVerified, submittedForVerification, hasRejectionReason, search } = {}) {
    const where = [];
    const params = [];

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
    const result = db.prepare(`SELECT COUNT(*) as n FROM user ${whereClause}`).get(...params);
    return result.n;
  },

  create(data) {
    const now = new Date().toISOString();
    const info = db.prepare(`
      INSERT INTO user (company_name, role, email, password, is_verified, otp_hash, otp_expires, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.companyName, data.role || "logistics", data.email, data.password,
      data.isVerified ? 1 : 0,
      data.otpHash ?? null,
      data.otpExpires ? new Date(data.otpExpires).toISOString() : null,
      now, now
    );
    return User.findById(info.lastInsertRowid);
  },

  update(id, data) {
    const sets = [];
    const params = [];
    const boolCols = new Set([
      "is_verified","is_account_verified","submitted_for_verification","is_active",
      "notif_pref_email","notif_pref_order_status","notif_pref_bid_updates",
      "notif_pref_new_order_alerts","notif_pref_chat_messages",
    ]);
    const dateCols = new Set(["otp_expires","reset_token_expires"]);
    const fieldMap = {
      companyName: "company_name", role: "role", email: "email", password: "password",
      contactNumber: "contact_number", panNo: "pan_no", companyLocation: "company_location",
      companyDescription: "company_description", companyLogo: "company_logo", companyWebsite: "company_website",
      isVerified: "is_verified", isAccountVerified: "is_account_verified",
      submittedForVerification: "submitted_for_verification", isActive: "is_active",
      rejectionReason: "rejection_reason", otpHash: "otp_hash", otpExpires: "otp_expires",
      resetTokenHash: "reset_token_hash", resetTokenExpires: "reset_token_expires",
      "notificationPreferences.emailNotifications": "notif_pref_email",
      "notificationPreferences.orderStatusUpdates": "notif_pref_order_status",
      "notificationPreferences.bidUpdates": "notif_pref_bid_updates",
      "notificationPreferences.newOrderAlerts": "notif_pref_new_order_alerts",
      "notificationPreferences.chatMessages": "notif_pref_chat_messages",
    };

    for (const [jsKey, colName] of Object.entries(fieldMap)) {
      if (jsKey in data) {
        let val = data[jsKey];
        if (boolCols.has(colName)) val = val ? 1 : 0;
        if (dateCols.has(colName)) val = val ? new Date(val).toISOString() : null;
        sets.push(`${colName} = ?`);
        params.push(val);
      }
    }

    if (sets.length === 0) return User.findById(id);
    sets.push("updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')");
    params.push(id);
    db.prepare(`UPDATE user SET ${sets.join(", ")} WHERE id = ?`).run(...params);
    return User.findById(id);
  },

  findWithDocuments(id) {
    const user = User.findById(id);
    if (!user) return null;
    user.documents = User.getDocuments(id);
    return user;
  },

  getDocuments(userId) {
    const rows = db.prepare("SELECT * FROM user_document WHERE user_id = ? ORDER BY uploaded_at ASC").all(userId);
    return rows.map(docFromRow);
  },

  addDocument(userId, doc) {
    const info = db.prepare(`
      INSERT INTO user_document (user_id, type, label, filename, url, uploaded_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, doc.type, doc.label ?? null, doc.filename, doc.url, doc.uploadedAt || new Date().toISOString());
    return docFromRow(db.prepare("SELECT * FROM user_document WHERE id = ?").get(info.lastInsertRowid));
  },

  deleteDocument(documentId) {
    const result = db.prepare("DELETE FROM user_document WHERE id = ?").run(documentId);
    return result.changes > 0;
  },

  getDocumentById(documentId) {
    const row = db.prepare("SELECT * FROM user_document WHERE id = ?").get(documentId);
    return docFromRow(row);
  },
};

export default User;
