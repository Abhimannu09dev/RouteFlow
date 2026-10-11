import crypto from "crypto";
import type { Request, Response } from "express";
import Payment from "../models/paymentModel.js";
import Order from "../models/orderModel.js";
import PriceOffer from "../models/priceOfferModel.js";
import User from "../models/userModel.js";
import { parsePagination, buildPaginationMeta } from "../utils/pagination.js";
import type { Order as OrderType } from "../types/index.js";

const FRONTEND_URL = process.env["FRONTEND_URL"] ?? "http://localhost:3000";
const KHALTI_INITIATE_URL = "https://dev.khalti.com/api/v2/epayment/initiate/";
const KHALTI_LOOKUP_URL = "https://dev.khalti.com/api/v2/epayment/lookup/";
const ESEWA_BASE_URL = "https://rc-epay.esewa.com.np";
const ESEWA_VERIFY_URL = `${ESEWA_BASE_URL}/api/epay/transaction/status/`;

class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

function resolvePayableOrder(orderId: number, userId: number): OrderType {
  const order = Order.findById(orderId);
  if (!order) throw new HttpError("Order not found", 404);
  if (order.status !== "delivered") throw new HttpError("Payment is only allowed for delivered orders", 403);
  if (String(order.manufacturer?.id) !== String(userId)) throw new HttpError("Only the manufacturer can initiate payment", 403);
  return order;
}

export const getPaymentStatus = (req: Request, res: Response): void => {
  try {
    const oid = parseInt((req.params as { orderId: string }).orderId, 10);

    const order = Order.findById(oid);
    if (!order) { res.status(404).json({ success: false, message: "Order not found" }); return; }

    const userId = String(req.user.id);
    const isManufacturer = String(order.manufacturer?.id) === userId;
    const isLogistics = String(order.logistics?.id) === userId;
    const isAdmin = req.user.role === "admin";

    if (!isManufacturer && !isLogistics && !isAdmin) {
      res.status(403).json({ success: false, message: "Not authorized" });
      return;
    }

    const payment = Payment.findOne({ orderId: oid });
    res.status(200).json({ success: true, payment });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const initiateKhalti = async (req: Request, res: Response): Promise<void> => {
  const KHALTI_SECRET_KEY = process.env["KHALTI_SECRET_KEY"];

  try {
    const { orderId } = req.body as { orderId: number };
    const oid = parseInt(String(orderId), 10);

    const existingPending = Payment.findOne({ orderId: oid, status: "pending" });
    if (existingPending) {
      res.status(200).json({
        success: true,
        message: "Payment already in progress",
        paymentId: existingPending.id,
        ...(existingPending.gateway === "khalti" ? { pidx: existingPending.pidx } : {}),
      });
      return;
    }

    const order = resolvePayableOrder(oid, req.user.id);

    const acceptedBid = PriceOffer.findOne({ orderId: oid, status: "accepted" });
    if (!acceptedBid) {
      res.status(400).json({ success: false, message: "No accepted bid found for this order" });
      return;
    }

    const user = User.findById(req.user.id);

    const logisticsId =
      typeof order.logistics === "object" && order.logistics !== null
        ? order.logistics.id
        : (order.logistics as unknown as number);

    const payment = Payment.create({
      orderId: oid,
      payerId: req.user.id,
      receiverId: logisticsId,
      amount: acceptedBid.proposedPrice,
      gateway: "khalti",
      status: "pending",
    });

    if (!payment) { res.status(500).json({ success: false, message: "Failed to create payment record" }); return; }

    const khaltiRes = await fetch(KHALTI_INITIATE_URL, {
      method: "POST",
      headers: { Authorization: `Key ${KHALTI_SECRET_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        return_url: `${FRONTEND_URL}/payment/khalti/verify`,
        website_url: FRONTEND_URL,
        amount: Math.round(acceptedBid.proposedPrice * 100),
        purchase_order_id: String(payment.id),
        purchase_order_name: `RouteFlow Order #${order.orderId}`,
        customer_info: { name: user?.companyName ?? "Manufacturer", email: user?.email ?? "" },
      }),
    });

    const khaltiData = await khaltiRes.json() as { pidx?: string; payment_url?: string; detail?: string };

    if (!khaltiRes.ok || !khaltiData.pidx) {
      Payment.deleteById(payment.id);
      res.status(400).json({ success: false, message: khaltiData.detail ?? "Failed to initiate Khalti payment" });
      return;
    }

    Payment.update(payment.id, { pidx: khaltiData.pidx });
    res.status(200).json({ success: true, paymentUrl: khaltiData.payment_url, pidx: khaltiData.pidx, paymentId: payment.id });
  } catch (error) {
    console.error("initiateKhalti error:", error);
    if (error instanceof HttpError) {
      res.status(error.status).json({ success: false, message: error.message });
    } else {
      res.status(500).json({ success: false, message: error instanceof Error ? error.message : "Server error" });
    }
  }
};

export const verifyKhalti = async (req: Request, res: Response): Promise<void> => {
  const KHALTI_SECRET_KEY = process.env["KHALTI_SECRET_KEY"];

  try {
    const { pidx, paymentId } = req.query as { pidx?: string; paymentId?: string };

    if (!pidx || !paymentId) {
      res.status(400).json({ success: false, message: "Missing pidx or paymentId" });
      return;
    }

    const payment = Payment.findById(parseInt(paymentId, 10));
    if (!payment) { res.status(404).json({ success: false, message: "Payment not found" }); return; }
    if (String(payment.payerId) !== String(req.user.id) && req.user.role !== "admin") {
      res.status(403).json({ success: false, message: "Not authorized" });
      return;
    }

    const khaltiRes = await fetch(KHALTI_LOOKUP_URL, {
      method: "POST",
      headers: { Authorization: `Key ${KHALTI_SECRET_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ pidx }),
    });

    const khaltiData = await khaltiRes.json() as { status?: string; transaction_id?: string };

    if (!khaltiRes.ok) {
      Payment.update(payment.id, { status: "failed" });
      res.status(400).json({ success: false, message: "Payment verification failed" });
      return;
    }

    const isCompleted = khaltiData.status === "Completed";
    Payment.update(payment.id, {
      status: isCompleted ? "completed" : "failed",
      transactionId: khaltiData.transaction_id ?? null,
    });

    res.status(200).json({ success: isCompleted, status: khaltiData.status, transactionId: khaltiData.transaction_id, amount: payment.amount });
  } catch (error) {
    console.error("verifyKhalti error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const initiateEsewa = (req: Request, res: Response): void => {
  try {
    const ESEWA_SECRET_KEY = (process.env["ESEWA_SECRET_KEY"] ?? "").replace(/^"|"$/g, "");
    const ESEWA_MERCHANT_CODE = (process.env["ESEWA_MERCHANT_CODE"] ?? "").replace(/^"|"$/g, "");
    const { orderId } = req.body as { orderId: number };
    const oid = parseInt(String(orderId), 10);

    const existingPending = Payment.findOne({ orderId: oid, status: "pending" });
    if (existingPending) {
      res.status(200).json({ success: true, message: "Payment already in progress", paymentId: existingPending.id });
      return;
    }

    const order = resolvePayableOrder(oid, req.user.id);

    const acceptedBid = PriceOffer.findOne({ orderId: oid, status: "accepted" });
    if (!acceptedBid) {
      res.status(400).json({ success: false, message: "No accepted bid found for this order" });
      return;
    }

    const amountStr = acceptedBid.proposedPrice.toFixed(2);

    const logisticsId =
      typeof order.logistics === "object" && order.logistics !== null
        ? order.logistics.id
        : (order.logistics as unknown as number);

    const payment = Payment.create({
      orderId: oid,
      payerId: req.user.id,
      receiverId: logisticsId,
      amount: acceptedBid.proposedPrice,
      gateway: "esewa",
      status: "pending",
    });

    if (!payment) { res.status(500).json({ success: false, message: "Failed to create payment record" }); return; }

    const transactionUuid = String(payment.id);
    const signatureString = `total_amount=${amountStr},transaction_uuid=${transactionUuid},product_code=${ESEWA_MERCHANT_CODE}`;
    const signature = crypto.createHmac("sha256", ESEWA_SECRET_KEY).update(signatureString).digest("base64");

    res.status(200).json({
      success: true,
      paymentId: payment.id,
      formData: {
        amount: amountStr, tax_amount: "0", total_amount: amountStr,
        transaction_uuid: transactionUuid, product_code: ESEWA_MERCHANT_CODE,
        product_service_charge: "0", product_delivery_charge: "0",
        success_url: `${FRONTEND_URL}/payment/esewa/verify?paymentId=${payment.id}`,
        failure_url: `${FRONTEND_URL}/payment/failed?paymentId=${payment.id}`,
        signed_field_names: "total_amount,transaction_uuid,product_code",
        signature,
      },
      esewaUrl: `${ESEWA_BASE_URL}/api/epay/main/v2/form`,
    });
  } catch (error) {
    console.error("initiateEsewa error:", error);
    if (error instanceof HttpError) {
      res.status(error.status).json({ success: false, message: error.message });
    } else {
      res.status(500).json({ success: false, message: error instanceof Error ? error.message : "Server error" });
    }
  }
};

export const verifyEsewa = async (req: Request, res: Response): Promise<void> => {
  try {
    const ESEWA_MERCHANT_CODE = (process.env["ESEWA_MERCHANT_CODE"] ?? "").replace(/^"|"$/g, "");
    const { data, paymentId } = req.query as { data?: string; paymentId?: string };

    if (!data || !paymentId) {
      res.status(400).json({ success: false, message: "Missing data or paymentId" });
      return;
    }

    const payment = Payment.findById(parseInt(paymentId, 10));
    if (!payment) { res.status(404).json({ success: false, message: "Payment not found" }); return; }
    if (String(payment.payerId) !== String(req.user.id) && req.user.role !== "admin") {
      res.status(403).json({ success: false, message: "Not authorized" });
      return;
    }

    const decoded = JSON.parse(Buffer.from(data, "base64").toString("utf-8")) as {
      status: string;
      total_amount: string;
      transaction_uuid: string;
      transaction_code?: string;
    };

    if (decoded.status !== "COMPLETE") {
      Payment.update(payment.id, { status: "failed" });
      res.status(200).json({ success: false, status: decoded.status });
      return;
    }

    const verifyUrl = `${ESEWA_VERIFY_URL}?product_code=${encodeURIComponent(ESEWA_MERCHANT_CODE)}&total_amount=${encodeURIComponent(decoded.total_amount)}&transaction_uuid=${encodeURIComponent(decoded.transaction_uuid)}`;
    const verifyRes = await fetch(verifyUrl, { method: "GET" });
    const verifyData = await verifyRes.json() as { status: string; total_amount: string; transaction_uuid: string };

    const amountMatches = Math.abs(parseFloat(verifyData.total_amount) - payment.amount) < 0.01;
    const isCompleted =
      verifyData.status === "COMPLETE" &&
      verifyData.transaction_uuid === decoded.transaction_uuid &&
      amountMatches;

    Payment.update(payment.id, {
      status: isCompleted ? "completed" : "failed",
      refId: decoded.transaction_code ?? null,
      transactionId: decoded.transaction_uuid,
    });

    res.status(200).json({
      success: isCompleted,
      status: verifyData.status,
      transactionId: decoded.transaction_uuid,
      refId: decoded.transaction_code,
    });
  } catch (error) {
    console.error("verifyEsewa error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getMyPayments = (req: Request, res: Response): void => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { id: userId } = req.user;
    const payments = Payment._findAllWithJoins({ payerId: userId, receiverId: userId }, { limit, skip });
    const total = Payment.count({ payerId: userId, receiverId: userId });
    res.status(200).json({ success: true, payments, pagination: buildPaginationMeta(total, page, limit) });
  } catch (error) {
    console.error("getMyPayments error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
