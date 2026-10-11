import db from "../db/database.js";
import type {
  PriceOffer,
  PriceOfferStatus,
  PriceOfferStats,
  OrderStatus,
  LogisticsRef,
  OrderSummary,
} from "../types/index.js";

interface PriceOfferRow {
  id: number;
  order_id: number;
  logistics_id: number;
  proposed_price: number;
  estimated_delivery_days: number;
  currency: string;
  note: string;
  status: PriceOfferStatus;
  created_at: string;
  updated_at: string;
  // join columns (OFFER_JOIN)
  log_id: number | null;
  log_company_name: string | null;
  log_email: string | null;
  log_company_logo: string | null;
  log_contact_number: string | null;
  // OFFER_ORDER_JOIN extras
  string_order_id: string | null;
  product_details: string | null;
  route_from: string | null;
  route_to: string | null;
  order_status: OrderStatus | null;
  mfg_id: number | null;
  mfg_company_name: string | null;
  mfg_email: string | null;
}

interface FindOneOptions {
  orderId?: number;
  logisticsId?: number;
  status?: PriceOfferStatus;
}

interface FindOptions {
  orderId?: number;
  logisticsId?: number;
  status?: PriceOfferStatus;
  statusNe?: PriceOfferStatus;
}

interface CreateOfferData {
  orderId: number;
  logisticsId: number;
  proposedPrice: number;
  estimatedDeliveryDays: number;
  currency?: string;
  note?: string;
  status?: PriceOfferStatus;
}

type UpdateOfferData = Partial<{
  proposedPrice: number;
  estimatedDeliveryDays: number;
  note: string;
  status: PriceOfferStatus;
}>;

interface UpdateManyFilter {
  orderId?: number;
  statusNe?: PriceOfferStatus;
}

function logisticsRef(row: PriceOfferRow): LogisticsRef | null {
  if (!row.log_id) return null;
  return {
    _id: row.log_id,
    id: row.log_id,
    companyName: row.log_company_name ?? null,
    email: row.log_email ?? null,
    companyLogo: row.log_company_logo ?? null,
    contactNumber: row.log_contact_number ?? null,
  };
}

function fromRow(row: PriceOfferRow | undefined): PriceOffer | null {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    order: row.order_id,
    orderId: row.string_order_id ?? null,
    logistics: row.log_id ? (logisticsRef(row) as LogisticsRef) : row.logistics_id,
    proposedPrice: row.proposed_price,
    estimatedDeliveryDays: row.estimated_delivery_days,
    currency: row.currency,
    note: row.note,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function fromRowWithOrder(row: PriceOfferRow | undefined): (PriceOffer & { order: OrderSummary }) | null {
  if (!row) return null;
  const offer = fromRow(row) as PriceOffer;
  offer.orderId = row.string_order_id ?? null;
  const orderSummary: OrderSummary = {
    _id: row.order_id,
    id: row.order_id,
    orderId: row.string_order_id,
    productDetails: row.product_details ?? null,
    routeFrom: row.route_from ?? null,
    routeTo: row.route_to ?? null,
    status: row.order_status ?? null,
    manufacturer: row.mfg_id
      ? { _id: row.mfg_id, id: row.mfg_id, companyName: row.mfg_company_name ?? "", email: row.mfg_email ?? "" }
      : null,
  };
  return { ...offer, order: orderSummary };
}

const OFFER_JOIN = `
  SELECT po.*,
    l.id AS log_id, l.company_name AS log_company_name, l.email AS log_email,
    l.company_logo AS log_company_logo, l.contact_number AS log_contact_number
  FROM price_offer po
  LEFT JOIN user l ON po.logistics_id = l.id
`;

const OFFER_ORDER_JOIN = `
  SELECT po.*,
    l.id AS log_id, l.company_name AS log_company_name, l.email AS log_email,
    l.company_logo AS log_company_logo, l.contact_number AS log_contact_number,
    o.order_id AS string_order_id, o.product_details, o.route_from, o.route_to, o.status AS order_status,
    m.id AS mfg_id, m.company_name AS mfg_company_name, m.email AS mfg_email
  FROM price_offer po
  LEFT JOIN user l ON po.logistics_id = l.id
  LEFT JOIN "order" o ON po.order_id = o.id
  LEFT JOIN user m ON o.manufacturer_id = m.id
`;

const PriceOfferModel = {
  findById(id: number): PriceOffer | null {
    const row = db.prepare(`${OFFER_JOIN} WHERE po.id = ?`).get(id) as PriceOfferRow | undefined;
    return fromRow(row);
  },

  findOne({ orderId, logisticsId, status }: FindOneOptions = {}): PriceOffer | null {
    const where: string[] = [];
    const params: unknown[] = [];
    if (orderId !== undefined) { where.push("po.order_id = ?"); params.push(orderId); }
    if (logisticsId !== undefined) { where.push("po.logistics_id = ?"); params.push(logisticsId); }
    if (status) { where.push("po.status = ?"); params.push(status); }
    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const row = db
      .prepare(`${OFFER_JOIN} ${whereClause} LIMIT 1`)
      .get(...params) as PriceOfferRow | undefined;
    return fromRow(row);
  },

  find(
    { orderId, logisticsId, status, statusNe }: FindOptions = {},
    { sort = "po.created_at DESC" }: { sort?: string } = {},
  ): PriceOffer[] {
    const where: string[] = [];
    const params: unknown[] = [];
    if (orderId !== undefined) { where.push("po.order_id = ?"); params.push(orderId); }
    if (logisticsId !== undefined) { where.push("po.logistics_id = ?"); params.push(logisticsId); }
    if (status) { where.push("po.status = ?"); params.push(status); }
    if (statusNe) { where.push("po.status != ?"); params.push(statusNe); }
    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const rows = db
      .prepare(`${OFFER_JOIN} ${whereClause} ORDER BY ${sort}`)
      .all(...params) as PriceOfferRow[];
    return rows.map((r) => fromRow(r) as PriceOffer);
  },

  findWithOrder(
    { logisticsId }: { logisticsId?: number } = {},
    { sort = "po.created_at DESC" }: { sort?: string } = {},
  ): (PriceOffer & { order: OrderSummary })[] {
    const where: string[] = [];
    const params: unknown[] = [];
    if (logisticsId !== undefined) { where.push("po.logistics_id = ?"); params.push(logisticsId); }
    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const rows = db
      .prepare(`${OFFER_ORDER_JOIN} ${whereClause} ORDER BY ${sort}`)
      .all(...params) as PriceOfferRow[];
    return rows.map((r) => fromRowWithOrder(r) as PriceOffer & { order: OrderSummary });
  },

  create(data: CreateOfferData): PriceOffer | null {
    const now = new Date().toISOString();
    const info = db
      .prepare(
        `INSERT INTO price_offer (order_id, logistics_id, proposed_price, estimated_delivery_days,
           currency, note, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        data.orderId,
        data.logisticsId,
        data.proposedPrice,
        data.estimatedDeliveryDays,
        data.currency ?? "NPR",
        data.note ?? "",
        data.status ?? "pending",
        now,
        now,
      );
    return PriceOfferModel.findById(info.lastInsertRowid as number);
  },

  update(id: number, data: UpdateOfferData): PriceOffer | null {
    const sets: string[] = [];
    const params: unknown[] = [];
    const map: Record<string, string> = {
      proposedPrice: "proposed_price",
      estimatedDeliveryDays: "estimated_delivery_days",
      note: "note",
      status: "status",
    };
    const dataRecord = data as Record<string, unknown>;
    for (const [k, col] of Object.entries(map)) {
      if (k in dataRecord) { sets.push(`${col} = ?`); params.push(dataRecord[k]); }
    }
    if (sets.length === 0) return PriceOfferModel.findById(id);
    sets.push("updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')");
    params.push(id);
    db.prepare(`UPDATE price_offer SET ${sets.join(", ")} WHERE id = ?`).run(...params);
    return PriceOfferModel.findById(id);
  },

  updateMany({ orderId, statusNe }: UpdateManyFilter = {}, updateData: { status?: PriceOfferStatus }): void {
    const sets: string[] = [];
    const setParams: unknown[] = [];
    if (updateData.status) { sets.push("status = ?"); setParams.push(updateData.status); }
    sets.push("updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')");

    const where: string[] = [];
    const whereParams: unknown[] = [];
    if (orderId !== undefined) { where.push("order_id = ?"); whereParams.push(orderId); }
    if (statusNe) { where.push("status != ?"); whereParams.push(statusNe); }
    if (!where.length) return;

    db.prepare(
      `UPDATE price_offer SET ${sets.join(", ")} WHERE ${where.join(" AND ")}`,
    ).run(...setParams, ...whereParams);
  },

  findPendingExcluding(orderId: number, excludeOfferId: number): PriceOffer[] {
    const rows = db
      .prepare(
        `${OFFER_JOIN} WHERE po.order_id = ? AND po.id != ? AND po.status = 'pending'`,
      )
      .all(orderId, excludeOfferId) as PriceOfferRow[];
    return rows.map((r) => fromRow(r) as PriceOffer);
  },

  getStats(logisticsId: number): PriceOfferStats {
    const row = db
      .prepare(
        `SELECT
           COUNT(*) as total,
           SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending,
           SUM(CASE WHEN status='accepted' THEN 1 ELSE 0 END) as accepted,
           SUM(CASE WHEN status='rejected' THEN 1 ELSE 0 END) as rejected,
           SUM(CASE WHEN status='withdrawn' THEN 1 ELSE 0 END) as withdrawn
         FROM price_offer WHERE logistics_id = ?`,
      )
      .get(logisticsId) as PriceOfferStats | undefined;
    return row ?? { total: 0, pending: 0, accepted: 0, rejected: 0, withdrawn: 0 };
  },
};

export default PriceOfferModel;
