import db from "../db/database.js";
import type { Order, OrderStatus, OrderStats, UserRef } from "../types/index.js";

interface OrderRow {
  id: number;
  order_id: string;
  manufacturer_id: number | null;
  logistics_id: number | null;
  product_details: string | null;
  vehicle_type: string | null;
  route_from: string | null;
  route_to: string | null;
  additional_info: string | null;
  quantity: number;
  weight: number;
  expected_price: number | null;
  status: OrderStatus;
  invoice_needed: number;
  vat_bill_needed: number;
  created_at: string;
  updated_at: string;
  // join columns
  mfg_id: number | null;
  mfg_company_name: string | null;
  mfg_email: string | null;
  mfg_company_logo: string | null;
  mfg_contact_number: string | null;
  log_id: number | null;
  log_company_name: string | null;
  log_email: string | null;
  log_company_logo: string | null;
  log_contact_number: string | null;
}

interface FindOptions {
  manufacturerId?: number;
  logisticsId?: number;
  logisticsNull?: boolean;
  status?: OrderStatus;
  statusIn?: OrderStatus[];
  statusNe?: OrderStatus;
}

interface FindPagination {
  sort?: string;
  limit?: number;
  skip?: number;
}

interface CreateOrderData {
  orderId: string;
  manufacturerId: number;
  productDetails?: string | null;
  vehicleType?: string | null;
  routeFrom?: string | null;
  routeTo?: string | null;
  additionalInfo?: string | null;
  quantity: number;
  weight: number;
  expectedPrice?: number | null;
  invoiceNeeded?: boolean;
  vatBillNeeded?: boolean;
}

type UpdateOrderData = Partial<{
  logisticsId: number | null;
  status: OrderStatus;
  invoiceNeeded: boolean;
  vatBillNeeded: boolean;
}>;

function userRef(prefix: string, row: OrderRow): UserRef | null {
  const id = row[`${prefix}_id` as keyof OrderRow] as number | null;
  if (!id) return null;
  return {
    _id: id,
    id,
    companyName: (row[`${prefix}_company_name` as keyof OrderRow] as string | null) ?? null,
    email: (row[`${prefix}_email` as keyof OrderRow] as string | null) ?? null,
    companyLogo: (row[`${prefix}_company_logo` as keyof OrderRow] as string | null) ?? null,
    contactNumber: (row[`${prefix}_contact_number` as keyof OrderRow] as string | null) ?? null,
  };
}

function fromRow(row: OrderRow | undefined): Order | null {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    orderId: row.order_id,
    manufacturer: userRef("mfg", row),
    logistics: userRef("log", row),
    productDetails: row.product_details ?? null,
    vehicleType: row.vehicle_type ?? null,
    routeFrom: row.route_from ?? null,
    routeTo: row.route_to ?? null,
    additionalInfo: row.additional_info ?? null,
    quantity: row.quantity,
    weight: row.weight,
    expectedPrice: row.expected_price ?? null,
    status: row.status,
    invoiceNeeded: row.invoice_needed === 1,
    vatBillNeeded: row.vat_bill_needed === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const ORDER_JOIN = `
  SELECT o.*,
    m.id AS mfg_id, m.company_name AS mfg_company_name, m.email AS mfg_email,
    m.company_logo AS mfg_company_logo, m.contact_number AS mfg_contact_number,
    l.id AS log_id, l.company_name AS log_company_name, l.email AS log_email,
    l.company_logo AS log_company_logo, l.contact_number AS log_contact_number
  FROM "order" o
  LEFT JOIN user m ON o.manufacturer_id = m.id
  LEFT JOIN user l ON o.logistics_id = l.id
`;

const OrderModel = {
  findById(id: number): Order | null {
    const row = db.prepare(`${ORDER_JOIN} WHERE o.id = ?`).get(id) as OrderRow | undefined;
    return fromRow(row);
  },

  findByOrderId(orderId: string): Order | null {
    const row = db.prepare(`${ORDER_JOIN} WHERE o.order_id = ?`).get(orderId) as OrderRow | undefined;
    return fromRow(row);
  },

  find(
    { manufacturerId, logisticsId, logisticsNull, status, statusIn, statusNe }: FindOptions = {},
    { sort = "o.created_at DESC", limit = 10, skip = 0 }: FindPagination = {},
  ): Order[] {
    const where: string[] = [];
    const params: unknown[] = [];

    if (manufacturerId !== undefined) { where.push("o.manufacturer_id = ?"); params.push(manufacturerId); }
    if (logisticsId !== undefined) { where.push("o.logistics_id = ?"); params.push(logisticsId); }
    if (logisticsNull === true) { where.push("o.logistics_id IS NULL"); }
    if (status) { where.push("o.status = ?"); params.push(status); }
    if (statusIn?.length) {
      where.push(`o.status IN (${statusIn.map(() => "?").join(",")})`);
      params.push(...statusIn);
    }
    if (statusNe) { where.push("o.status != ?"); params.push(statusNe); }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const rows = db
      .prepare(`${ORDER_JOIN} ${whereClause} ORDER BY ${sort} LIMIT ? OFFSET ?`)
      .all(...params, limit, skip) as OrderRow[];
    return rows.map((r) => fromRow(r) as Order);
  },

  findForParticipant(
    userId: number,
    statusIn: OrderStatus[] = [],
    { sort = "o.updated_at DESC" }: { sort?: string } = {},
  ): Order[] {
    if (!statusIn.length) return [];
    const placeholders = statusIn.map(() => "?").join(",");
    const rows = db
      .prepare(
        `${ORDER_JOIN}
         WHERE o.status IN (${placeholders}) AND (o.manufacturer_id = ? OR o.logistics_id = ?)
         ORDER BY ${sort}`,
      )
      .all(...statusIn, userId, userId) as OrderRow[];
    return rows.map((r) => fromRow(r) as Order);
  },

  count({
    manufacturerId,
    logisticsId,
    logisticsNull,
    status,
    statusIn,
  }: Omit<FindOptions, "statusNe"> = {}): number {
    const where: string[] = [];
    const params: unknown[] = [];

    if (manufacturerId !== undefined) { where.push("manufacturer_id = ?"); params.push(manufacturerId); }
    if (logisticsId !== undefined) { where.push("logistics_id = ?"); params.push(logisticsId); }
    if (logisticsNull === true) { where.push("logistics_id IS NULL"); }
    if (status) { where.push("status = ?"); params.push(status); }
    if (statusIn?.length) {
      where.push(`status IN (${statusIn.map(() => "?").join(",")})`);
      params.push(...statusIn);
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const result = db
      .prepare(`SELECT COUNT(*) as n FROM "order" ${whereClause}`)
      .get(...params) as { n: number };
    return result.n;
  },

  create(data: CreateOrderData): Order | null {
    const now = new Date().toISOString();
    const info = db
      .prepare(
        `INSERT INTO "order" (order_id, manufacturer_id, product_details, vehicle_type,
           route_from, route_to, additional_info, quantity, weight, expected_price,
           invoice_needed, vat_bill_needed, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        data.orderId,
        data.manufacturerId,
        data.productDetails ?? null,
        data.vehicleType ?? null,
        data.routeFrom ?? null,
        data.routeTo ?? null,
        data.additionalInfo ?? null,
        data.quantity,
        data.weight,
        data.expectedPrice ?? null,
        data.invoiceNeeded ? 1 : 0,
        data.vatBillNeeded ? 1 : 0,
        now,
        now,
      );
    return OrderModel.findById(info.lastInsertRowid as number);
  },

  update(id: number, data: UpdateOrderData): Order | null {
    const sets: string[] = [];
    const params: unknown[] = [];
    const map: Record<string, string> = {
      logisticsId: "logistics_id",
      status: "status",
      invoiceNeeded: "invoice_needed",
      vatBillNeeded: "vat_bill_needed",
    };
    const dataRecord = data as Record<string, unknown>;
    for (const [k, col] of Object.entries(map)) {
      if (k in dataRecord) {
        let val: unknown = dataRecord[k];
        if (col === "invoice_needed" || col === "vat_bill_needed") val = val ? 1 : 0;
        sets.push(`${col} = ?`);
        params.push(val);
      }
    }
    if (sets.length === 0) return OrderModel.findById(id);
    sets.push("updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')");
    params.push(id);
    db.prepare(`UPDATE "order" SET ${sets.join(", ")} WHERE id = ?`).run(...params);
    return OrderModel.findById(id);
  },

  updateByOrderId(
    orderId: string,
    logisticsId: number,
    data: { status?: OrderStatus },
  ): Order | null {
    const sets: string[] = [];
    const params: unknown[] = [];
    if (data.status) { sets.push("status = ?"); params.push(data.status); }
    if (sets.length === 0) return OrderModel.findByOrderId(orderId);
    sets.push("updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')");
    params.push(orderId, logisticsId);
    const result = db
      .prepare(`UPDATE "order" SET ${sets.join(", ")} WHERE order_id = ? AND logistics_id = ?`)
      .run(...params);
    if (result.changes === 0) return null;
    return OrderModel.findByOrderId(orderId);
  },

  getStats(manufacturerId: number): OrderStats {
    const row = db
      .prepare(
        `SELECT
           COUNT(*) as total,
           SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending,
           SUM(CASE WHEN status='accepted' THEN 1 ELSE 0 END) as accepted,
           SUM(CASE WHEN status='in transit' THEN 1 ELSE 0 END) as inTransit,
           SUM(CASE WHEN status='delivered' THEN 1 ELSE 0 END) as delivered,
           SUM(CASE WHEN status='cancelled' THEN 1 ELSE 0 END) as cancelled
         FROM "order" WHERE manufacturer_id = ?`,
      )
      .get(manufacturerId) as OrderStats | undefined;
    return row ?? { total: 0, pending: 0, accepted: 0, inTransit: 0, delivered: 0, cancelled: 0 };
  },
};

export default OrderModel;
