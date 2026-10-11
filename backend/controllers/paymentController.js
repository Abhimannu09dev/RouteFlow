import crypto from "crypto";
import Payment from "../models/paymentModel.js";
import Order from "../models/orderModel.js";
import PriceOffer from "../models/priceOfferModel.js";
import User from "../models/userModel.js";
import { parsePagination, buildPaginationMeta } from "../utils/pagination.js";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const KHALTI_INITIATE_URL = "https://dev.khalti.com/api/v2/epayment/initiate/";
const KHALTI_LOOKUP_URL = "https://dev.khalti.com/api/v2/epayment/lookup/";
const ESEWA_BASE_URL = "https://rc-epay.esewa.com.np";
const ESEWA_VERIFY_URL = `${ESEWA_BASE_URL}/api/epay/transaction/status/`;

const resolvePayableOrder = (orderId, userId) => {
  const order = Order.findById(orderId);
  if (!order) {
    const err = new Error("Order not found");
    err.status = 404;
    throw err;
  }
  if (order.status !== "delivered") {
    const err = new Error("Payment is only allowed for delivered orders");
    err.status = 403;
    throw err;
  }
  if (String(order.manufacturer?.id) !== String(userId)) {
    const err = new Error("Only the manufacturer can initiate payment");
    err.status = 403;
    throw err;
  }
  return order;
};

const getPaymentStatus = (req, res) => {
  try {
    const { orderId } = req.params;
    const oid = parseInt(orderId, 10);

    const order = Order.findById(oid);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const userId = String(req.user.id);
    const isManufacturer = String(order.manufacturer?.id) === userId;
    const isLogistics = String(order.logistics?.id) === userId;
    const isAdmin = req.user.role === "admin";

    if (!isManufacturer && !isLogistics && !isAdmin) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const payment = Payment.findOne({ orderId: oid });
    return res.status(200).json({ success: true, payment });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const initiateKhalti = async (req, res) => {
  const KHALTI_SECRET_KEY = process.env.KHALTI_SECRET_KEY;

  try {
    const { orderId } = req.body;
    const oid = parseInt(orderId, 10);

    const existingPending = Payment.findOne({ orderId: oid, status: "pending" });
    if (existingPending) {
      const response = { success: true, message: "Payment already in progress", paymentId: existingPending.id };
      if (existingPending.gateway === "khalti") response.pidx = existingPending.pidx;
      return res.status(200).json(response);
    }

    const order = resolvePayableOrder(oid, req.user.id);

    const acceptedBid = PriceOffer.findOne({ orderId: oid, status: "accepted" });
    if (!acceptedBid) {
      return res.status(400).json({ success: false, message: "No accepted bid found for this order" });
    }

    const user = User.findById(req.user.id);

    const payment = Payment.create({
      orderId: oid,
      payerId: req.user.id,
      receiverId: order.logistics.id,
      amount: acceptedBid.proposedPrice,
      gateway: "khalti",
      status: "pending",
    });

    const khaltiRes = await fetch(KHALTI_INITIATE_URL, {
      method: "POST",
      headers: { Authorization: `Key ${KHALTI_SECRET_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        return_url: `${FRONTEND_URL}/payment/khalti/verify`,
        website_url: FRONTEND_URL,
        amount: Math.round(acceptedBid.proposedPrice * 100),
        purchase_order_id: String(payment.id),
        purchase_order_name: `RouteFlow Order #${order.orderId}`,
        customer_info: { name: user.companyName || "Manufacturer", email: user.email },
      }),
    });

    const khaltiData = await khaltiRes.json();

    if (!khaltiRes.ok || !khaltiData.pidx) {
      Payment.deleteById(payment.id);
      return res.status(400).json({ success: false, message: khaltiData.detail || "Failed to initiate Khalti payment" });
    }

    Payment.update(payment.id, { pidx: khaltiData.pidx });

    return res.status(200).json({ success: true, paymentUrl: khaltiData.payment_url, pidx: khaltiData.pidx, paymentId: payment.id });
  } catch (error) {
    console.error("initiateKhalti error:", error);
    return res.status(error.status || 500).json({ success: false, message: error.message || "Server error" });
  }
};

const verifyKhalti = async (req, res) => {
  const KHALTI_SECRET_KEY = process.env.KHALTI_SECRET_KEY;

  try {
    const { pidx, paymentId } = req.query;

    if (!pidx || !paymentId) {
      return res.status(400).json({ success: false, message: "Missing pidx or paymentId" });
    }

    const payment = Payment.findById(parseInt(paymentId, 10));
    if (!payment) return res.status(404).json({ success: false, message: "Payment not found" });
    if (String(payment.payerId) !== String(req.user.id) && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const khaltiRes = await fetch(KHALTI_LOOKUP_URL, {
      method: "POST",
      headers: { Authorization: `Key ${KHALTI_SECRET_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ pidx }),
    });

    const khaltiData = await khaltiRes.json();

    if (!khaltiRes.ok) {
      Payment.update(payment.id, { status: "failed" });
      return res.status(400).json({ success: false, message: "Payment verification failed" });
    }

    const isCompleted = khaltiData.status === "Completed";
    Payment.update(payment.id, { status: isCompleted ? "completed" : "failed", transactionId: khaltiData.transaction_id || null });

    return res.status(200).json({ success: isCompleted, status: khaltiData.status, transactionId: khaltiData.transaction_id, amount: khaltiData.amount });
  } catch (error) {
    console.error("verifyKhalti error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const initiateEsewa = async (req, res) => {
  try {
    const ESEWA_SECRET_KEY = (process.env.ESEWA_SECRET_KEY || "").replace(/^"|"$/g, "");
    const ESEWA_MERCHANT_CODE = (process.env.ESEWA_MERCHANT_CODE || "").replace(/^"|"$/g, "");
    const { orderId } = req.body;
    const oid = parseInt(orderId, 10);

    const existingPending = Payment.findOne({ orderId: oid, status: "pending" });
    if (existingPending) {
      return res.status(200).json({ success: true, message: "Payment already in progress", paymentId: existingPending.id });
    }

    const order = resolvePayableOrder(oid, req.user.id);

    const acceptedBid = PriceOffer.findOne({ orderId: oid, status: "accepted" });
    if (!acceptedBid) {
      return res.status(400).json({ success: false, message: "No accepted bid found for this order" });
    }

    const amountStr = Number(acceptedBid.proposedPrice).toFixed(2);
    const payment = Payment.create({
      orderId: oid,
      payerId: req.user.id,
      receiverId: order.logistics.id,
      amount: acceptedBid.proposedPrice,
      gateway: "esewa",
      status: "pending",
    });

    const transactionUuid = String(payment.id);
    const signatureString = `total_amount=${amountStr},transaction_uuid=${transactionUuid},product_code=${ESEWA_MERCHANT_CODE}`;
    const signature = crypto.createHmac("sha256", ESEWA_SECRET_KEY).update(signatureString).digest("base64");

    return res.status(200).json({
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
    return res.status(error.status || 500).json({ success: false, message: error.message || "Server error" });
  }
};

const verifyEsewa = async (req, res) => {
  try {
    const ESEWA_MERCHANT_CODE = (process.env.ESEWA_MERCHANT_CODE || "").replace(/^"|"$/g, "");
    const { data, paymentId } = req.query;

    if (!data || !paymentId) {
      return res.status(400).json({ success: false, message: "Missing data or paymentId" });
    }

    const payment = Payment.findById(parseInt(paymentId, 10));
    if (!payment) return res.status(404).json({ success: false, message: "Payment not found" });
    if (String(payment.payerId) !== String(req.user.id) && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const decoded = JSON.parse(Buffer.from(data, "base64").toString("utf-8"));

    if (decoded.status !== "COMPLETE") {
      Payment.update(payment.id, { status: "failed" });
      return res.status(200).json({ success: false, status: decoded.status });
    }

    const verifyUrl = `${ESEWA_VERIFY_URL}?product_code=${encodeURIComponent(ESEWA_MERCHANT_CODE)}&total_amount=${encodeURIComponent(decoded.total_amount)}&transaction_uuid=${encodeURIComponent(decoded.transaction_uuid)}`;
    const verifyRes = await fetch(verifyUrl, { method: "GET" });
    const verifyData = await verifyRes.json();

    const amountMatches = Math.abs(parseFloat(verifyData.total_amount) - payment.amount) < 0.01;
    const isCompleted = verifyData.status === "COMPLETE" && verifyData.transaction_uuid === decoded.transaction_uuid && amountMatches;

    Payment.update(payment.id, {
      status: isCompleted ? "completed" : "failed",
      refId: decoded.transaction_code || null,
      transactionId: decoded.transaction_uuid || null,
    });

    return res.status(200).json({ success: isCompleted, status: verifyData.status, transactionId: decoded.transaction_uuid, refId: decoded.transaction_code });
  } catch (error) {
    console.error("verifyEsewa error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const getMyPayments = (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const userId = req.user.id;
    const payments = Payment._findAllWithJoins({ payerId: userId, receiverId: userId }, { limit, skip });
    const total = Payment.count({ payerId: userId, receiverId: userId });
    return res.status(200).json({ success: true, payments, pagination: buildPaginationMeta(total, page, limit) });
  } catch (error) {
    console.error("getMyPayments error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export { getPaymentStatus, initiateKhalti, verifyKhalti, initiateEsewa, verifyEsewa, getMyPayments };
