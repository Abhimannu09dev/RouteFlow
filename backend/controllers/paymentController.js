import dotenv from "dotenv";
dotenv.config();
import crypto from "crypto";
import Payment from "../models/paymentModel.js";
import Order from "../models/orderModel.js";
import PriceOffer from "../models/priceOfferModel.js";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

//  Khalti Config
const KHALTI_SECRET_KEY = process.env.KHALTI_SECRET_KEY;
console.log("KHALTI_SECRET_KEY:", KHALTI_SECRET_KEY);
const KHALTI_INITIATE_URL = "https://dev.khalti.com/api/v2/epayment/initiate/";
const KHALTI_LOOKUP_URL = "https://dev.khalti.com/api/v2/epayment/lookup/";

//  eSewa Config ─
const ESEWA_SECRET_KEY = process.env.ESEWA_SECRET_KEY.replace(/^"|"$/g, "");
const ESEWA_MERCHANT_CODE = process.env.ESEWA_MERCHANT_CODE.replace(
  /^"|"$/g,
  "",
);
const ESEWA_BASE_URL = "https://rc-epay.esewa.com.np";
const ESEWA_VERIFY_URL = `${ESEWA_BASE_URL}/api/epay/transaction/status/`;

//  Helper: verify order is delivered and user is manufacturer
const resolvePayableOrder = async (orderId, userId) => {
  const order = await Order.findById(orderId).populate(
    "logistics",
    "companyName email",
  );
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
  if (order.manufacturer.toString() !== userId.toString()) {
    const err = new Error("Only the manufacturer can initiate payment");
    err.status = 403;
    throw err;
  }
  return order;
};

const getPaymentStatus = async (req, res) => {
  try {
    const payment = await Payment.findOne({
      orderId: req.params.orderId,
    }).sort({ createdAt: -1 });
    res.json({ success: true, payment });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const initiateKhalti = async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await resolvePayableOrder(orderId, req.user.id);

    const acceptedBid = await PriceOffer.findOne({
      order: orderId,
      status: "accepted",
    });
    if (!acceptedBid) {
      return res.status(400).json({
        success: false,
        message: "No accepted bid found for this order",
      });
    }

    // Khalti uses paisa — 1 NPR = 100 paisa
    const amountInPaisa = Math.round(acceptedBid.proposedPrice * 100);

    const payment = await Payment.create({
      orderId,
      payerId: req.user.id,
      receiverId: order.logistics._id,
      amount: acceptedBid.proposedPrice,
      gateway: "khalti",
      status: "pending",
    });

    const khaltiRes = await fetch(KHALTI_INITIATE_URL, {
      method: "POST",
      headers: {
        Authorization: `Key ${KHALTI_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        return_url: `${FRONTEND_URL}/payment/khalti/verify`,
        website_url: FRONTEND_URL,
        amount: amountInPaisa,
        purchase_order_id: payment._id.toString(),
        purchase_order_name: `RouteFlow Order #${order.orderId}`,
        customer_info: {
          name: req.user.companyName || "Manufacturer",
          email: req.user.email,
        },
      }),
    });

    const khaltiData = await khaltiRes.json();

    if (!khaltiRes.ok || !khaltiData.pidx) {
      await Payment.findByIdAndDelete(payment._id);
      return res.status(400).json({
        success: false,
        message: khaltiData.detail || "Failed to initiate Khalti payment",
      });
    }

    await Payment.findByIdAndUpdate(payment._id, { pidx: khaltiData.pidx });

    res.json({
      success: true,
      paymentUrl: khaltiData.payment_url,
      pidx: khaltiData.pidx,
      paymentId: payment._id,
    });
  } catch (err) {
    console.error("initiateKhalti error:", err);
    res
      .status(err.status || 500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

const verifyKhalti = async (req, res) => {
  try {
    const { pidx, paymentId } = req.query;

    if (!pidx || !paymentId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing pidx or paymentId" });
    }

    const khaltiRes = await fetch(KHALTI_LOOKUP_URL, {
      method: "POST",
      headers: {
        Authorization: `Key ${KHALTI_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pidx }),
    });

    const khaltiData = await khaltiRes.json();

    if (!khaltiRes.ok) {
      await Payment.findByIdAndUpdate(paymentId, { status: "failed" });
      return res
        .status(400)
        .json({ success: false, message: "Payment verification failed" });
    }

    const isCompleted = khaltiData.status === "Completed";
    await Payment.findByIdAndUpdate(paymentId, {
      status: isCompleted ? "completed" : "failed",
      transactionId: khaltiData.transaction_id || null,
    });

    res.json({
      success: isCompleted,
      status: khaltiData.status,
      transactionId: khaltiData.transaction_id,
      amount: khaltiData.amount,
    });
  } catch (err) {
    console.error("verifyKhalti error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const initiateEsewa = async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await resolvePayableOrder(orderId, req.user.id);

    const acceptedBid = await PriceOffer.findOne({
      order: orderId,
      status: "accepted",
    });
    if (!acceptedBid) {
      return res.status(400).json({
        success: false,
        message: "No accepted bid found for this order",
      });
    }

    // eSewa RC requires decimal format e.g. "100000.00" not "100000"
    const amountStr = Number(acceptedBid.proposedPrice).toFixed(2);

    const payment = await Payment.create({
      orderId,
      payerId: req.user.id,
      receiverId: order.logistics._id,
      amount: acceptedBid.proposedPrice,
      gateway: "esewa",
      status: "pending",
    });

    const transactionUuid = payment._id.toString();
    const successUrl = `${FRONTEND_URL}/payment/esewa/verify?paymentId=${payment._id}`;
    const failureUrl = `${FRONTEND_URL}/payment/failed?paymentId=${payment._id}`;

    // Signature: values must exactly match what is sent in form fields
    const signatureString = `total_amount=${amountStr},transaction_uuid=${transactionUuid},product_code=${ESEWA_MERCHANT_CODE}`;
    const signature = crypto
      .createHmac("sha256", ESEWA_SECRET_KEY)
      .update(signatureString)
      .digest("base64");

    res.json({
      success: true,
      paymentId: payment._id,
      formData: {
        amount: amountStr,
        tax_amount: "0",
        total_amount: amountStr,
        transaction_uuid: transactionUuid,
        product_code: ESEWA_MERCHANT_CODE,
        product_service_charge: "0",
        product_delivery_charge: "0",
        success_url: successUrl,
        failure_url: failureUrl,
        signed_field_names: "total_amount,transaction_uuid,product_code",
        signature,
      },
      esewaUrl: `${ESEWA_BASE_URL}/api/epay/main/v2/form`,
    });
  } catch (err) {
    console.error("initiateEsewa error:", err);
    res
      .status(err.status || 500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

const verifyEsewa = async (req, res) => {
  try {
    const { data, paymentId } = req.query;

    if (!data || !paymentId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing data or paymentId" });
    }

    // Decode base64 response from eSewa
    const decoded = JSON.parse(Buffer.from(data, "base64").toString("utf-8"));

    if (decoded.status !== "COMPLETE") {
      await Payment.findByIdAndUpdate(paymentId, { status: "failed" });
      return res.json({ success: false, status: decoded.status });
    }

    // Verify with eSewa transaction status API
    const verifyUrl = `${ESEWA_VERIFY_URL}?product_code=${encodeURIComponent(
      ESEWA_MERCHANT_CODE,
    )}&total_amount=${encodeURIComponent(
      decoded.total_amount,
    )}&transaction_uuid=${encodeURIComponent(decoded.transaction_uuid)}`;

    const verifyRes = await fetch(verifyUrl, { method: "GET" });
    const verifyData = await verifyRes.json();

    const isCompleted =
      verifyData.status === "COMPLETE" &&
      verifyData.transaction_uuid === decoded.transaction_uuid;

    await Payment.findByIdAndUpdate(paymentId, {
      status: isCompleted ? "completed" : "failed",
      refId: decoded.transaction_code || null,
      transactionId: decoded.transaction_uuid || null,
    });

    res.json({
      success: isCompleted,
      status: verifyData.status,
      transactionId: decoded.transaction_uuid,
      refId: decoded.transaction_code,
    });
  } catch (err) {
    console.error("verifyEsewa error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getMyPayments = async (req, res) => {
  try {
    const userId = req.user.id;
    const payments = await Payment.find({
      $or: [{ payerId: userId }, { receiverId: userId }],
    })
      .populate("orderId", "orderId productDetails routeFrom routeTo")
      .populate("payerId", "companyName")
      .populate("receiverId", "companyName")
      .sort({ createdAt: -1 });

    res.json({ success: true, payments });
  } catch (err) {
    console.error("getMyPayments error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export {
  getPaymentStatus,
  initiateKhalti,
  verifyKhalti,
  initiateEsewa,
  verifyEsewa,
  getMyPayments,
};
