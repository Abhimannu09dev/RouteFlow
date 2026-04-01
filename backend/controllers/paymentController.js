import crypto from "crypto";
import Payment from "../models/paymentModel.js";
import Order from "../models/orderModel.js";
import PriceOffer from "../models/priceOfferModel.js";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

//  Khalti Config
const KHALTI_SECRET_KEY =
  process.env.KHALTI_SECRET_KEY ||
  "test_secret_key_f59e8b7d18b4499ca40f68195a473d57";
const KHALTI_BASE_URL = "https://a.khalti.com/api/v2";

//  eSewa Config
const ESEWA_SECRET_KEY = process.env.ESEWA_SECRET_KEY || "8gBm/:&EnhH.1[q";
const ESEWA_MERCHANT_CODE = process.env.ESEWA_MERCHANT_CODE || "EPAYTEST";
const ESEWA_BASE_URL = "https://uat.esewa.com.np";

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
    const payment = await Payment.findOne({ orderId: req.params.orderId }).sort(
      { createdAt: -1 },
    );
    res.json({ success: true, payment });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const initiateKhalti = async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await resolvePayableOrder(orderId, req.user.id);

    // Get accepted bid amount

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

    // Amount in paisa (Khalti uses paisa — 1 NPR = 100 paisa)
    const amountInPaisa = Math.round(acceptedBid.proposedPrice * 100);

    // Create pending payment record
    const payment = await Payment.create({
      orderId,
      payerId: req.user.id,
      receiverId: order.logistics._id,
      amount: acceptedBid.proposedPrice,
      gateway: "khalti",
      status: "pending",
    });

    // Call Khalti initiate API
    const khaltiRes = await fetch(`${KHALTI_BASE_URL}/epayment/initiate/`, {
      method: "POST",
      headers: {
        Authorization: `Key ${KHALTI_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        return_url: `${FRONTEND_URL}/payment/khalti/verify?paymentId=${payment._id}`,
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

    // Save pidx for verification
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

// Called after Khalti redirects back to frontend, which then calls this
const verifyKhalti = async (req, res) => {
  try {
    const { pidx, paymentId } = req.query;

    if (!pidx || !paymentId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing pidx or paymentId" });
    }

    // Lookup payment on Khalti
    const khaltiRes = await fetch(`${KHALTI_BASE_URL}/epayment/lookup/`, {
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

    const amount = acceptedBid.proposedPrice;

    const payment = await Payment.create({
      orderId,
      payerId: req.user.id,
      receiverId: order.logistics._id,
      amount,
      gateway: "esewa",
      status: "pending",
    });

    const transactionUuid = payment._id.toString();
    const successUrl = `${FRONTEND_URL}/payment/esewa/verify?paymentId=${payment._id}`;
    const failureUrl = `${FRONTEND_URL}/payment/failed?paymentId=${payment._id}`;

    // Generate HMAC-SHA256 signature
    // eSewa signature format: "total_amount=<amount>,transaction_uuid=<uuid>,product_code=<code>"
    const signatureString = `total_amount=${amount},transaction_uuid=${transactionUuid},product_code=${ESEWA_MERCHANT_CODE}`;
    const signature = crypto
      .createHmac("sha256", ESEWA_SECRET_KEY)
      .update(signatureString)
      .digest("base64");

    // Return form data — frontend will POST this as a form to eSewa
    res.json({
      success: true,
      paymentId: payment._id,
      formData: {
        amount: amount.toString(),
        tax_amount: "0",
        total_amount: amount.toString(),
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

    // Verify signature
    const signatureString = `transaction_code=${decoded.transaction_code},status=${decoded.status},total_amount=${decoded.total_amount},transaction_uuid=${decoded.transaction_uuid},product_code=${decoded.product_code},signed_field_names=${decoded.signed_field_names}`;
    const expectedSignature = crypto
      .createHmac("sha256", ESEWA_SECRET_KEY)
      .update(signatureString)
      .digest("base64");

    const isValid = expectedSignature === decoded.signature;
    const isCompleted = decoded.status === "COMPLETE" && isValid;

    await Payment.findByIdAndUpdate(paymentId, {
      status: isCompleted ? "completed" : "failed",
      refId: decoded.transaction_code || null,
      transactionId: decoded.transaction_uuid || null,
    });

    res.json({
      success: isCompleted,
      status: decoded.status,
      transactionId: decoded.transaction_uuid,
      refId: decoded.transaction_code,
    });
  } catch (err) {
    console.error("verifyEsewa error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export {
  getPaymentStatus,
  initiateKhalti,
  verifyKhalti,
  initiateEsewa,
  verifyEsewa,
};
