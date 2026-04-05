/* eslint-disable @typescript-eslint/no-explicit-any */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

async function apiFetch(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || data.message || "Request failed");
  return data;
}

export type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type PaginationParams = {
  page?: number;
  limit?: number;
};

function buildPaginationQuery(params?: PaginationParams): string {
  if (!params) return "";
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  const str = qs.toString();
  return str ? `?${str}` : "";
}

export const authAPI = {
  register: (
    companyName: string,
    email: string,
    password: string,
    role: string,
  ) =>
    apiFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify({ companyName, email, password, role }),
    }),

  verifyOtp: (email: string, otp: string) =>
    apiFetch("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ email, otp }),
    }),

  resendOtp: (email: string) =>
    apiFetch("/auth/resend-otp", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  login: (email: string, password: string) =>
    apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  forgotPassword: (email: string) =>
    apiFetch("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, password: string, confirmPassword: string) =>
    apiFetch("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password, confirmPassword }),
    }),

  logout: () => apiFetch("/auth/logout", { method: "POST" }),

  me: () => apiFetch("/auth/me"),
};

export type CreateOrderPayload = {
  productDetails: string;
  quantity: number;
  weight: number;
  vehicleType: string;
  invoiceNeeded: boolean;
  vatBillNeeded: boolean;
  routeFrom: string;
  routeTo: string;
  additionalInfo?: string;
  expectedPrice?: number;
};

export type OrdersResponse = {
  success: boolean;
  orders: any[];
  pagination: PaginationMeta;
};

export const orderAPI = {
  createOrder: (payload: CreateOrderPayload) =>
    apiFetch("/create/order", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Manufacturer: their own orders | Logistics: available pending orders
  getOrders: (params?: PaginationParams): Promise<OrdersResponse> =>
    apiFetch(`/orders${buildPaginationQuery(params)}`),

  // Orders assigned to the logged-in user (history)
  getMyOrders: (params?: PaginationParams): Promise<OrdersResponse> =>
    apiFetch(`/my-orders${buildPaginationQuery(params)}`),

  getOrderDetails: (orderId: string) => apiFetch(`/orders/${orderId}`),

  acceptOrder: (orderId: string) =>
    apiFetch(`/orders/${orderId}/accept`, { method: "PUT" }),

  updateStatus: (orderId: string, status: string) =>
    apiFetch(`/orders/${orderId}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),
};

export type SubmitOfferPayload = {
  proposedPrice: number;
  estimatedDeliveryDays: number;
  note?: string;
};

export type OffersResponse = {
  success: boolean;
  offers: any[];
  pagination: PaginationMeta;
};

export const priceOfferAPI = {
  submitOffer: (orderId: string, payload: SubmitOfferPayload) =>
    apiFetch(`/orders/${orderId}/offers`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getOffers: (orderId: string) => apiFetch(`/orders/${orderId}/offers`),

  getMyOffers: (params?: PaginationParams): Promise<OffersResponse> =>
    apiFetch(`/orders/my-offers${buildPaginationQuery(params)}`),

  updateOffer: (
    orderId: string,
    offerId: string,
    payload: Partial<SubmitOfferPayload>,
  ) =>
    apiFetch(`/orders/${orderId}/offers/${offerId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  withdrawOffer: (orderId: string, offerId: string) =>
    apiFetch(`/orders/${orderId}/offers/${offerId}`, { method: "DELETE" }),

  acceptOffer: (orderId: string, offerId: string) =>
    apiFetch(`/orders/${orderId}/offers/${offerId}/accept`, { method: "PUT" }),
};

export type Message = {
  _id: string;
  orderId: string;
  senderId: { _id: string; companyName: string; email: string; role: string };
  receiverId: string;
  content: string;
  fileUrl: string | null;
  fileType: "image" | "document" | null;
  fileName: string | null;
  isRead: boolean;
  createdAt: string;
};

export type Conversation = {
  orderId: string;
  orderTitle: string;
  orderStatus: string;
  isClosed: boolean;
  otherParty: { _id: string; companyName: string; email: string } | null;
  lastMessage: {
    content: string;
    fileType: string | null;
    fileName: string | null;
    sentAt: string;
    senderName: string;
  } | null;
  unreadCount: number;
};

export const chatAPI = {
  getConversations: (): Promise<{
    success: boolean;
    conversations: Conversation[];
  }> => apiFetch("/chat/conversations"),

  getMessages: (
    orderId: string,
  ): Promise<{
    success: boolean;
    messages: Message[];
    isClosed: boolean;
    orderStatus: string;
    participants: {
      manufacturer: { _id: string; companyName: string } | null;
      logistics: { _id: string; companyName: string } | null;
    };
  }> => apiFetch(`/chat/${orderId}/messages`),

  getUnreadCount: (): Promise<{ success: boolean; count: number }> =>
    apiFetch("/chat/unread-count"),

  sendFile: async (
    orderId: string,
    receiverId: string,
    file: File,
    content?: string,
  ) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("receiverId", receiverId);
    if (content) formData.append("content", content);

    const response = await fetch(`${API_BASE_URL}/chat/${orderId}/send`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error || data.message || "File upload failed");
    return data;
  },
};

export type NotificationPreferences = {
  emailNotifications: boolean;
  orderStatusUpdates: boolean;
  bidUpdates: boolean;
  newOrderAlerts: boolean;
  chatMessages: boolean;
};

export const settingsAPI = {
  getNotificationPreferences: (): Promise<{
    success: boolean;
    preferences: NotificationPreferences;
  }> => apiFetch("/settings/notifications"),

  updateNotificationPreferences: (
    prefs: NotificationPreferences,
  ): Promise<{
    success: boolean;
    preferences: NotificationPreferences;
  }> =>
    apiFetch("/settings/notifications", {
      method: "PUT",
      body: JSON.stringify(prefs),
    }),

  changePassword: (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ) =>
    apiFetch("/settings/change-password", {
      method: "PUT",
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
    }),

  deactivateAccount: (password: string) =>
    apiFetch("/settings/account", {
      method: "DELETE",
      body: JSON.stringify({ password }),
    }),
};

export type SupportTicket = {
  _id: string;
  userId: string;
  subject: string;
  message: string;
  category: "general" | "technical" | "billing";
  status: "open" | "in-progress" | "resolved";
  adminReply: string | null;
  repliedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export const supportAPI = {
  createTicket: (
    subject: string,
    message: string,
    category: string,
  ): Promise<{
    success: boolean;
    ticket: SupportTicket;
  }> =>
    apiFetch("/support", {
      method: "POST",
      body: JSON.stringify({ subject, message, category }),
    }),

  getMyTickets: (
    params?: PaginationParams,
  ): Promise<{
    success: boolean;
    tickets: SupportTicket[];
    pagination: PaginationMeta;
  }> => apiFetch(`/support/my-tickets${buildPaginationQuery(params)}`),
};

export const adminSupportAPI = {
  getAllTickets: (
    filters?: { status?: string; category?: string } & PaginationParams,
  ): Promise<{
    success: boolean;
    tickets: (SupportTicket & {
      userId: { _id: string; companyName: string; email: string; role: string };
    })[];
    pagination: PaginationMeta;
  }> => {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.category) params.set("category", filters.category);
    if (filters?.page) params.set("page", String(filters.page));
    if (filters?.limit) params.set("limit", String(filters.limit));
    const qs = params.toString();
    return apiFetch(`/admin/support-tickets${qs ? `?${qs}` : ""}`);
  },

  updateTicket: (
    ticketId: string,
    updates: { status?: string; adminReply?: string },
  ): Promise<{
    success: boolean;
    ticket: SupportTicket;
  }> =>
    apiFetch(`/admin/support-tickets/${ticketId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    }),
};

export const adminAPI = {
  getUsers: (
    filters?: {
      status?: string;
      role?: string;
      search?: string;
    } & PaginationParams,
  ): Promise<{
    success: boolean;
    users: any[];
    pagination: PaginationMeta;
  }> => {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.role) params.set("role", filters.role);
    if (filters?.search) params.set("search", filters.search);
    if (filters?.page) params.set("page", String(filters.page));
    if (filters?.limit) params.set("limit", String(filters.limit));
    const qs = params.toString();
    return apiFetch(`/admin/users${qs ? `?${qs}` : ""}`);
  },
};

// ── Payments ──────────────────────────────────────────────────────────────────

export type Payment = {
  _id: string;
  orderId: string;
  payerId: string;
  receiverId: string;
  amount: number;
  gateway: "khalti" | "esewa";
  status: "pending" | "completed" | "failed";
  pidx: string | null;
  refId: string | null;
  transactionId: string | null;
  createdAt: string;
};

export const paymentAPI = {
  getPaymentStatus: (
    orderId: string,
  ): Promise<{ success: boolean; payment: Payment | null }> =>
    apiFetch(`/payment/status/${orderId}`),

  getMyPayments: (
    params?: PaginationParams,
  ): Promise<{
    success: boolean;
    payments: any[];
    pagination: PaginationMeta;
  }> => apiFetch(`/payment/my-payments${buildPaginationQuery(params)}`),

  initiateKhalti: (
    orderId: string,
  ): Promise<{
    success: boolean;
    paymentUrl: string;
    pidx: string;
    paymentId: string;
  }> =>
    apiFetch("/payment/khalti/initiate", {
      method: "POST",
      body: JSON.stringify({ orderId }),
    }),

  verifyKhalti: (
    pidx: string,
    paymentId: string,
  ): Promise<{
    success: boolean;
    status: string;
    transactionId: string;
  }> => apiFetch(`/payment/khalti/verify?pidx=${pidx}&paymentId=${paymentId}`),

  initiateEsewa: (
    orderId: string,
  ): Promise<{
    success: boolean;
    paymentId: string;
    formData: Record<string, string>;
    esewaUrl: string;
  }> =>
    apiFetch("/payment/esewa/initiate", {
      method: "POST",
      body: JSON.stringify({ orderId }),
    }),

  verifyEsewa: (
    data: string,
    paymentId: string,
  ): Promise<{
    success: boolean;
    status: string;
    transactionId: string;
    refId: string;
  }> => apiFetch(`/payment/esewa/verify?data=${data}&paymentId=${paymentId}`),
};
