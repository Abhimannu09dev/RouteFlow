import Notification from "../models/notificationModel.js";
import User from "../models/userModel.js";
import { notifyUser } from "./index.js";

const createAndSend = (recipientId, type, title, message, orderId) => {
  try {
    const notification = Notification.create({ recipientId, type, title, message, orderId });
    notifyUser(recipientId, notification);
    return notification;
  } catch (error) {
    console.error("Failed to create notification:", error.message);
  }
};

const notifyLogisticsNewOrder = (order) => {
  try {
    const logisticsUsers = User.findAll({ role: "logistics", isActive: true });
    logisticsUsers.forEach((user) =>
      createAndSend(
        user.id,
        "new_order",
        "New Order Available",
        `A new shipment from ${order.routeFrom} to ${order.routeTo} is available for bidding.`,
        order.orderId,
      )
    );
  } catch (error) {
    console.error("notifyLogisticsNewOrder error:", error.message);
  }
};

const notifyManufacturerNewBid = (order, offer, logisticsCompanyName) => {
  const manufacturerId = order.manufacturer?.id ?? order.manufacturer;
  return createAndSend(
    manufacturerId,
    "new_bid",
    "New Price Offer Received",
    `${logisticsCompanyName} submitted a bid of NPR ${offer.proposedPrice.toLocaleString()} on order ${order.orderId}.`,
    order.orderId,
  );
};

const notifyLogisticsBidAccepted = (offer, order) => {
  const logisticsId = offer.logistics?.id ?? offer.logistics;
  return createAndSend(
    logisticsId,
    "bid_accepted",
    "Your Bid Was Accepted! 🎉",
    `Your bid of NPR ${offer.proposedPrice.toLocaleString()} for order ${order.orderId} was accepted. Check your History tab.`,
    order.orderId,
  );
};

const notifyLogisticsBidRejected = (logisticsId, orderId, proposedPrice) => {
  return createAndSend(
    logisticsId,
    "bid_rejected",
    "Bid Not Selected",
    `Your bid of NPR ${proposedPrice.toLocaleString()} for order ${orderId} was not selected.`,
    orderId,
  );
};

const notifyManufacturerStatusUpdate = (order, newStatus, logisticsCompanyName) => {
  const statusMessages = {
    "in transit": `Your order ${order.orderId} is now in transit with ${logisticsCompanyName}.`,
    delivered: `Your order ${order.orderId} has been delivered by ${logisticsCompanyName}.`,
    cancelled: `Your order ${order.orderId} was cancelled by ${logisticsCompanyName}.`,
  };

  const message = statusMessages[newStatus];
  if (!message) return;

  const manufacturerId = order.manufacturer?.id ?? order.manufacturer;
  return createAndSend(
    manufacturerId,
    "status_update",
    `Order ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
    message,
    order.orderId,
  );
};

export {
  notifyLogisticsNewOrder,
  notifyManufacturerNewBid,
  notifyLogisticsBidAccepted,
  notifyLogisticsBidRejected,
  notifyManufacturerStatusUpdate,
};
