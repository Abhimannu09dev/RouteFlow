import Notification from "../models/notificationModel.js";
import User from "../models/userModel.js";
import { notifyUser } from "./index.js";
import type { Order, PriceOffer, NotificationType, LogisticsRef } from "../types/index.js";

function getLogisticsId(logistics: LogisticsRef | number): number {
  return typeof logistics === "object" ? logistics.id : logistics;
}

function createAndSend(
  recipientId: number,
  type: NotificationType,
  title: string,
  message: string,
  orderId: number | null,
): ReturnType<typeof Notification.create> {
  try {
    const notification = Notification.create({ recipientId, type, title, message, orderId });
    if (notification) notifyUser(recipientId, notification);
    return notification;
  } catch (error) {
    console.error(
      "Failed to create notification:",
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
}

export function notifyLogisticsNewOrder(order: Order): void {
  try {
    const logisticsUsers = User.findAll({ role: "logistics", isActive: true });
    logisticsUsers.forEach((user) =>
      createAndSend(
        user.id,
        "new_order",
        "New Order Available",
        `A new shipment from ${order.routeFrom ?? "unknown"} to ${order.routeTo ?? "unknown"} is available for bidding.`,
        order.id,
      ),
    );
  } catch (error) {
    console.error(
      "notifyLogisticsNewOrder error:",
      error instanceof Error ? error.message : String(error),
    );
  }
}

export function notifyManufacturerNewBid(
  order: Order,
  offer: PriceOffer,
  logisticsCompanyName: string,
): ReturnType<typeof Notification.create> {
  const manufacturerId = order.manufacturer?.id ?? 0;
  return createAndSend(
    manufacturerId,
    "new_bid",
    "New Price Offer Received",
    `${logisticsCompanyName} submitted a bid of NPR ${offer.proposedPrice.toLocaleString()} on order ${order.orderId}.`,
    order.id,
  );
}

export function notifyLogisticsBidAccepted(
  offer: PriceOffer,
  order: Order,
): ReturnType<typeof Notification.create> {
  return createAndSend(
    getLogisticsId(offer.logistics),
    "bid_accepted",
    "Your Bid Was Accepted! 🎉",
    `Your bid of NPR ${offer.proposedPrice.toLocaleString()} for order ${order.orderId} was accepted. Check your History tab.`,
    order.id,
  );
}

export function notifyLogisticsBidRejected(
  logisticsId: number,
  orderId: string,
  proposedPrice: number,
): ReturnType<typeof Notification.create> {
  return createAndSend(
    logisticsId,
    "bid_rejected",
    "Bid Not Selected",
    `Your bid of NPR ${proposedPrice.toLocaleString()} for order ${orderId} was not selected.`,
    null,
  );
}

export function notifyManufacturerStatusUpdate(
  order: Order,
  newStatus: string,
  logisticsCompanyName: string,
): ReturnType<typeof Notification.create> | undefined {
  const statusMessages: Record<string, string> = {
    "in transit": `Your order ${order.orderId} is now in transit with ${logisticsCompanyName}.`,
    delivered: `Your order ${order.orderId} has been delivered by ${logisticsCompanyName}.`,
    cancelled: `Your order ${order.orderId} was cancelled by ${logisticsCompanyName}.`,
  };

  const message = statusMessages[newStatus];
  if (!message) return undefined;

  const manufacturerId = order.manufacturer?.id ?? 0;
  return createAndSend(
    manufacturerId,
    "status_update",
    `Order ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
    message,
    order.id,
  );
}
