import db from "../db/database.js";
import type { Payment, PaymentGateway, PaymentStatus } from "../types/index.js";

interface PaymentRow {
  id: number;
  order_id: number;
  payer_id: number;
  receiver_id: number;
  amount: number;
  gateway: PaymentGateway;
  status: PaymentStatus;
  pidx: string | null;
  ref_id: string | null;
  transaction_id: string | null;
  created_at: string;
  updated_at: string;
  // join columns
  order_order_id: string | null;
  order_product_details: string | null;
  order_route_from: string | null;
  order_route_to: string | null;
  payer_company_name: string | null;
  receiver_company_name: string | null;
}

interface FindOneOptions {
  orderId?: number;
  status?: PaymentStatus;
  payerId?: number;
}

interface FindAllOptions {
  payerId?: number;
  receiverId?: number;
}

interface FindAllPagination {
  sort?: string;
  limit?: number;
  skip?: number;
}

interface CreatePaymentData {
  orderId: number;
  payerId: number;
  receiverId: number;
  amount: number;
  gateway: PaymentGateway;
  status?: PaymentStatus;
  pidx?: string | null;
  refId?: string | null;
  transactionId?: string | null;
}

type UpdatePaymentData = Partial<{
  status: PaymentStatus;
  pidx: string | null;
  refId: string | null;
  transactionId: string | null;
}>;

const PAYMENT_JOIN = `
  SELECT p.*,
    o.order_id AS order_order_id, o.product_details AS order_product_details,
    o.route_from AS order_route_from, o.route_to AS order_route_to,
    pu.company_name AS payer_company_name,
    ru.company_name AS receiver_company_name
  FROM payment p
  LEFT JOIN "order" o ON p.order_id = o.id
  LEFT JOIN user pu ON p.payer_id = pu.id
  LEFT JOIN user ru ON p.receiver_id = ru.id
`;

function fromRow(row: PaymentRow | undefined): Payment | null {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    orderId: row.order_id,
    payerId: row.payer_id,
    receiverId: row.receiver_id,
    amount: row.amount,
    gateway: row.gateway,
    status: row.status,
    pidx: row.pidx ?? null,
    refId: row.ref_id ?? null,
    transactionId: row.transaction_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    order: row.order_order_id
      ? {
          _id: row.order_id,
          id: row.order_id,
          orderId: row.order_order_id,
          productDetails: row.order_product_details ?? "",
          routeFrom: row.order_route_from ?? "",
          routeTo: row.order_route_to ?? "",
        }
      : undefined,
    payer: row.payer_company_name
      ? { _id: row.payer_id, id: row.payer_id, companyName: row.payer_company_name }
      : undefined,
    receiver: row.receiver_company_name
      ? { _id: row.receiver_id, id: row.receiver_id, companyName: row.receiver_company_name }
      : undefined,
  };
}

const PaymentModel = {
  findById(id: number): Payment | null {
    const row = db
      .prepare("SELECT * FROM payment WHERE id = ?")
      .get(id) as PaymentRow | undefined;
    return fromRow(row);
  },

  findOne({ orderId, status, payerId }: FindOneOptions = {}): Payment | null {
    const where: string[] = [];
    const params: unknown[] = [];
    if (orderId !== undefined) { where.push("order_id = ?"); params.push(orderId); }
    if (status) { where.push("status = ?"); params.push(status); }
    if (payerId !== undefined) { where.push("payer_id = ?"); params.push(payerId); }
    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const row = db
      .prepare(`SELECT * FROM payment ${whereClause} ORDER BY created_at DESC LIMIT 1`)
      .get(...params) as PaymentRow | undefined;
    return fromRow(row);
  },

  _findAllWithJoins(
    { payerId, receiverId }: FindAllOptions = {},
    { sort = "p.created_at DESC", limit = 10, skip = 0 }: FindAllPagination = {},
  ): Payment[] {
    const where: string[] = [];
    const params: unknown[] = [];
    if (payerId !== undefined && receiverId !== undefined) {
      where.push("(p.payer_id = ? OR p.receiver_id = ?)");
      params.push(payerId, payerId);
    } else if (payerId !== undefined) {
      where.push("p.payer_id = ?");
      params.push(payerId);
    } else if (receiverId !== undefined) {
      where.push("p.receiver_id = ?");
      params.push(receiverId);
    }
    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const rows = db
      .prepare(`${PAYMENT_JOIN} ${whereClause} ORDER BY ${sort} LIMIT ? OFFSET ?`)
      .all(...params, limit, skip) as PaymentRow[];
    return rows.map((r) => fromRow(r) as Payment);
  },

  count({ payerId, receiverId }: FindAllOptions = {}): number {
    const where: string[] = [];
    const params: unknown[] = [];
    if (payerId !== undefined && receiverId !== undefined) {
      where.push("(payer_id = ? OR receiver_id = ?)");
      params.push(payerId, payerId);
    } else if (payerId !== undefined) {
      where.push("payer_id = ?");
      params.push(payerId);
    } else if (receiverId !== undefined) {
      where.push("receiver_id = ?");
      params.push(receiverId);
    }
    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const result = db
      .prepare(`SELECT COUNT(*) as n FROM payment ${whereClause}`)
      .get(...params) as { n: number };
    return result.n;
  },

  create(data: CreatePaymentData): Payment | null {
    const now = new Date().toISOString();
    const info = db
      .prepare(
        `INSERT INTO payment (order_id, payer_id, receiver_id, amount, gateway, status, pidx, ref_id, transaction_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        data.orderId,
        data.payerId,
        data.receiverId,
        data.amount,
        data.gateway,
        data.status ?? "pending",
        data.pidx ?? null,
        data.refId ?? null,
        data.transactionId ?? null,
        now,
        now,
      );
    return PaymentModel.findById(info.lastInsertRowid as number);
  },

  update(id: number, data: UpdatePaymentData): Payment | null {
    const sets: string[] = [];
    const params: unknown[] = [];
    const map: Record<string, string> = {
      status: "status",
      pidx: "pidx",
      refId: "ref_id",
      transactionId: "transaction_id",
    };
    const dataRecord = data as Record<string, unknown>;
    for (const [k, col] of Object.entries(map)) {
      if (k in dataRecord) { sets.push(`${col} = ?`); params.push(dataRecord[k]); }
    }
    if (sets.length === 0) return PaymentModel.findById(id);
    sets.push("updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')");
    params.push(id);
    db.prepare(`UPDATE payment SET ${sets.join(", ")} WHERE id = ?`).run(...params);
    return PaymentModel.findById(id);
  },

  deleteById(id: number): void {
    db.prepare("DELETE FROM payment WHERE id = ?").run(id);
  },
};

export default PaymentModel;
