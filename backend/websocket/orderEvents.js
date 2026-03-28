const Notification = require("../models/notificationModel");
const { notifyUser, notifyRole } = require("./index");

//  Helper: save to DB and emit via socket
async function createAndSend(recipientId, type, title, message, orderId) {
  try {
    const notification = await Notification.create({
      recipient: recipientId,
      type,
      title,
      message,
      orderId,
    });
    notifyUser(recipientId, notification);
    return notification;
  } catch (error) {
    console.error("Failed to create notification:", error.message);
  }
}

//  New order placed — notify all logistics companies
async function notifyLogisticsNewOrder(order) {
  try {
    notifyRole("logistics", {
      type: "new_order",
      title: "New Order Available",
      message: `A new shipment from ${order.routeFrom} to ${order.routeTo} is available for bidding.`,
      orderId: order.orderId,
    });
  } catch (error) {
    console.error("notifyLogisticsNewOrder error:", error.message);
  }
}

//  New bid received — notify the manufacturer
async function notifyManufacturerNewBid(order, offer, logisticsCompanyName) {
  return createAndSend(
    order.manufacturer,
    "new_bid",
    "New Price Offer Received",
    `${logisticsCompanyName} submitted a bid of NPR ${offer.proposedPrice.toLocaleString()} on order ${order.orderId}.`,
    order.orderId,
  );
}

//  Bid accepted — notify the winning logistics company
async function notifyLogisticsBidAccepted(offer, order) {
  return createAndSend(
    offer.logistics,
    "bid_accepted",
    "Your Bid Was Accepted! 🎉",
    `Your bid of NPR ${offer.proposedPrice.toLocaleString()} for order ${order.orderId} was accepted. Check your History tab.`,
    order.orderId,
  );
}

//  Bid rejected — notify the losing logistics companies
async function notifyLogisticsBidRejected(logisticsId, orderId, proposedPrice) {
  return createAndSend(
    logisticsId,
    "bid_rejected",
    "Bid Not Selected",
    `Your bid of NPR ${proposedPrice.toLocaleString()} for order ${orderId} was not selected.`,
    orderId,
  );
}

//  Order directly accepted — notify manufacturer
async function notifyManufacturerOrderAccepted(order, logisticsCompanyName) {
  return createAndSend(
    order.manufacturer,
    "order_accepted",
    "Order Accepted",
    `${logisticsCompanyName} accepted your order ${order.orderId} at your expected price.`,
    order.orderId,
  );
}

//  Status update — notify manufacturer
async function notifyManufacturerStatusUpdate(
  order,
  newStatus,
  logisticsCompanyName,
) {
  const statusMessages = {
    "in transit": `Your order ${order.orderId} is now in transit with ${logisticsCompanyName}.`,
    delivered: `Your order ${order.orderId} has been delivered by ${logisticsCompanyName}.`,
    cancelled: `Your order ${order.orderId} was cancelled by ${logisticsCompanyName}.`,
  };

  const message = statusMessages[newStatus];
  if (!message) return;

  return createAndSend(
    order.manufacturer,
    "status_update",
    `Order ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
    message,
    order.orderId,
  );
}

module.exports = {
  notifyLogisticsNewOrder,
  notifyManufacturerNewBid,
  notifyLogisticsBidAccepted,
  notifyLogisticsBidRejected,
  notifyManufacturerOrderAccepted,
  notifyManufacturerStatusUpdate,
};
