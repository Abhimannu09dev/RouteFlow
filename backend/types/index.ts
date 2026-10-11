// ── Domain literals ────────────────────────────────────────────────────────

export type UserRole = "logistics" | "manufacturer" | "admin";
export type OrderStatus = "pending" | "accepted" | "in transit" | "delivered" | "cancelled";
export type PriceOfferStatus = "pending" | "accepted" | "rejected" | "withdrawn";
export type PaymentGateway = "khalti" | "esewa";
export type PaymentStatus = "pending" | "completed" | "failed";
export type NotificationType =
  | "new_bid"
  | "bid_accepted"
  | "bid_rejected"
  | "order_accepted"
  | "new_order"
  | "status_update";
export type TicketCategory = "general" | "technical" | "billing";
export type TicketStatus = "open" | "in-progress" | "resolved";
export type DocType = "invoice" | "vat_bill";
export type MessageFileType = "image" | "document";
export type MimeExtension = ".jpg" | ".png" | ".webp" | ".pdf";

// ── Domain objects returned by models ──────────────────────────────────────

export interface NotificationPreferences {
  emailNotifications: boolean;
  orderStatusUpdates: boolean;
  bidUpdates: boolean;
  newOrderAlerts: boolean;
  chatMessages: boolean;
}

export interface UserDocument {
  _id: number;
  id: number;
  type: string;
  label: string | null;
  filename: string;
  url: string;
  uploadedAt: string;
}

export interface User {
  _id: number;
  id: number;
  companyName: string;
  role: UserRole;
  email: string;
  contactNumber: string | null;
  panNo: string | null;
  companyLocation: string | null;
  companyDescription: string | null;
  companyLogo: string | null;
  companyWebsite: string | null;
  isVerified: boolean;
  isAccountVerified: boolean;
  submittedForVerification: boolean;
  isActive: boolean;
  rejectionReason: string | null;
  otpHash: string | null;
  otpExpires: Date | null;
  resetTokenHash: string | null;
  resetTokenExpires: Date | null;
  notificationPreferences: NotificationPreferences;
  documents: UserDocument[];
  createdAt: string;
  updatedAt: string;
}

export interface UserWithPassword extends User {
  password: string;
}

export interface UserRef {
  _id: number;
  id: number;
  companyName: string | null;
  email: string | null;
  companyLogo: string | null;
  contactNumber: string | null;
}

export interface Order {
  _id: number;
  id: number;
  orderId: string;
  manufacturer: UserRef | null;
  logistics: UserRef | null;
  productDetails: string | null;
  vehicleType: string | null;
  routeFrom: string | null;
  routeTo: string | null;
  additionalInfo: string | null;
  quantity: number;
  weight: number;
  expectedPrice: number | null;
  status: OrderStatus;
  invoiceNeeded: boolean;
  vatBillNeeded: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrderStats {
  total: number;
  pending: number;
  accepted: number;
  inTransit: number;
  delivered: number;
  cancelled: number;
}

export interface LogisticsRef {
  _id: number;
  id: number;
  companyName: string | null;
  email: string | null;
  companyLogo: string | null;
  contactNumber: string | null;
}

export interface PriceOffer {
  _id: number;
  id: number;
  order: number | OrderSummary;
  orderId: string | null;
  logistics: LogisticsRef | number;
  proposedPrice: number;
  estimatedDeliveryDays: number;
  currency: string;
  note: string;
  status: PriceOfferStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OrderSummary {
  _id: number;
  id: number;
  orderId: string | null;
  productDetails: string | null;
  routeFrom: string | null;
  routeTo: string | null;
  status: OrderStatus | null;
  manufacturer: { _id: number; id: number; companyName: string; email: string } | null;
}

export interface PriceOfferStats {
  total: number;
  pending: number;
  accepted: number;
  rejected: number;
  withdrawn: number;
}

export interface Payment {
  _id: number;
  id: number;
  orderId: number;
  payerId: number;
  receiverId: number;
  amount: number;
  gateway: PaymentGateway;
  status: PaymentStatus;
  pidx: string | null;
  refId: string | null;
  transactionId: string | null;
  createdAt: string;
  updatedAt: string;
  order?: {
    _id: number;
    id: number;
    orderId: string;
    productDetails: string;
    routeFrom: string;
    routeTo: string;
  };
  payer?: { _id: number; id: number; companyName: string };
  receiver?: { _id: number; id: number; companyName: string };
}

export interface Message {
  _id: number;
  id: number;
  orderId: number;
  senderId: number;
  receiverId: number;
  content: string;
  fileUrl: string | null;
  fileName: string | null;
  fileType: MessageFileType | null;
  isRead: boolean;
  createdAt: string;
  sender?: {
    _id: number;
    id: number;
    companyName: string;
    email: string | null;
    role: string | null;
  };
}

export interface Notification {
  _id: number;
  id: number;
  recipient: number;
  type: NotificationType;
  title: string;
  message: string;
  orderId: number | null;
  isRead: boolean;
  createdAt: string;
}

export interface SupportTicket {
  _id: number;
  id: number;
  userId: number;
  subject: string;
  message: string;
  category: TicketCategory;
  status: TicketStatus;
  adminReply: string | null;
  repliedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    _id: number;
    id: number;
    companyName: string;
    email: string | null;
    role: string | null;
  };
}

// ── Auth user attached to request by auth middleware ───────────────────────

export interface AuthUser {
  id: number;
  role: UserRole;
  isAccountVerified: boolean;
}

// ── Express augmentation ───────────────────────────────────────────────────

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user: AuthUser;
    }
  }
}
