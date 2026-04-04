import dotenv from "dotenv";
dotenv.config();
import crypto from "crypto";
import Payment from "../models/paymentModel.js";
import Order from "../models/orderModel.js";
import PriceOffer from "../models/priceOfferModel.js";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const KHALTI_INITIATE_URL = "https://dev.khalti.com/api/v2/epayment/initiate/";
const KHALTI_LOOKUP_URL = "https://dev.khalti.com/api/v2/epayment/lookup/";
const ESEWA_BASE_URL = "https://rc-epay.esewa.com.np";
const ESEWA_VERIFY_URL = `${ESEWA_BASE_URL}/api/epay/transaction/status/`;

const parsePagination = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const buildPaginationMeta = (total, page, limit) => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
});

// Verify the order is delivered and the requesting user is the manufacturer
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

// Get the latest payment status for an order
const getPaymentStatus = async (req, res) => {
  try {
    const payment = await Payment.findOne({ orderId: req.params.orderId }).sort(
      { createdAt: -1 },
    );
    return res.status(200).json({ success: true, payment });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Initiate a Khalti payment for a delivered order
const initiateKhalti = async (req, res) => {
  const KHALTI_SECRET_KEY = process.env.KHALTI_SECRET_KEY; // read lazily — ES Module dotenv timing fix

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
        amount: Math.round(acceptedBid.proposedPrice * 100), // Khalti uses paisa
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

    return res.status(200).json({
      success: true,
      paymentUrl: khaltiData.payment_url,
      pidx: khaltiData.pidx,
      paymentId: payment._id,
    });
  } catch (error) {
    console.error("initiateKhalti error:", error);
    return res
      .status(error.status || 500)
      .json({ success: false, message: error.message || "Server error" });
  }
};

// Verify Khalti payment status after redirect
const verifyKhalti = async (req, res) => {
  const KHALTI_SECRET_KEY = process.env.KHALTI_SECRET_KEY; // read lazily — ES Module dotenv timing fix

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

    return res.status(200).json({
      success: isCompleted,
      status: khaltiData.status,
      transactionId: khaltiData.transaction_id,
      amount: khaltiData.amount,
    });
  } catch (error) {
    console.error("verifyKhalti error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Initiate an eSewa payment for a delivered order
const initiateEsewa = async (req, res) => {
  const ESEWA_SECRET_KEY = process.env.ESEWA_SECRET_KEY.replace(/^"|"$/g, ""); // read lazily
  const ESEWA_MERCHANT_CODE = process.env.ESEWA_MERCHANT_CODE.replace(
    /^"|"$/g,
    "",
  ); // read lazily

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
    const signatureString = `total_amount=${amountStr},transaction_uuid=${transactionUuid},product_code=${ESEWA_MERCHANT_CODE}`;
    const signature = crypto
      .createHmac("sha256", ESEWA_SECRET_KEY)
      .update(signatureString)
      .digest("base64");

    return res.status(200).json({
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
        success_url: `${FRONTEND_URL}/payment/esewa/verify?paymentId=${payment._id}`,
        failure_url: `${FRONTEND_URL}/payment/failed?paymentId=${payment._id}`,
        signed_field_names: "total_amount,transaction_uuid,product_code",
        signature,
      },
      esewaUrl: `${ESEWA_BASE_URL}/api/epay/main/v2/form`,
    });
  } catch (error) {
    console.error("initiateEsewa error:", error);
    return res
      .status(error.status || 500)
      .json({ success: false, message: error.message || "Server error" });
  }
};

// Verify eSewa payment status after redirect
const verifyEsewa = async (req, res) => {
  const ESEWA_MERCHANT_CODE = process.env.ESEWA_MERCHANT_CODE.replace(
    /^"|"$/g,
    "",
  ); // read lazily

  try {
    const { data, paymentId } = req.query;

    if (!data || !paymentId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing data or paymentId" });
    }

    const decoded = JSON.parse(Buffer.from(data, "base64").toString("utf-8"));

    if (decoded.status !== "COMPLETE") {
      await Payment.findByIdAndUpdate(paymentId, { status: "failed" });
      return res.status(200).json({ success: false, status: decoded.status });
    }

    const verifyUrl = `${ESEWA_VERIFY_URL}?product_code=${encodeURIComponent(ESEWA_MERCHANT_CODE)}&total_amount=${encodeURIComponent(decoded.total_amount)}&transaction_uuid=${encodeURIComponent(decoded.transaction_uuid)}`;
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

    return res.status(200).json({
      success: isCompleted,
      status: verifyData.status,
      transactionId: decoded.transaction_uuid,
      refId: decoded.transaction_code,
    });
  } catch (error) {
    console.error("verifyEsewa error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get all payments for the logged-in user (paginated)
const getMyPayments = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const userId = req.user.id;
    const filter = { $or: [{ payerId: userId }, { receiverId: userId }] };

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate("orderId", "orderId productDetails routeFrom routeTo")
        .populate("payerId", "companyName")
        .populate("receiverId", "companyName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Payment.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      payments,
      pagination: buildPaginationMeta(total, page, limit),
    });
  } catch (error) {
    console.error("getMyPayments error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
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
