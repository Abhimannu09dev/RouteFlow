const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Helper to reduce repetition
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

//  Auth

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

//  Orders

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

export const orderAPI = {
  createOrder: (payload: CreateOrderPayload) =>
    apiFetch("/create/order", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getOrders: () => apiFetch("/orders"),

  getMyOrders: () => apiFetch("/my-orders"),

  getOrderDetails: (orderId: string) => apiFetch(`/orders/${orderId}`),

  acceptOrder: (orderId: string) =>
    apiFetch(`/orders/${orderId}/accept`, { method: "PUT" }),

  updateStatus: (orderId: string, status: string) =>
    apiFetch(`/orders/${orderId}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),
};

//  Price Offers

export type SubmitOfferPayload = {
  proposedPrice: number;
  estimatedDeliveryDays: number;
  note?: string;
};

export const priceOfferAPI = {
  submitOffer: (orderId: string, payload: SubmitOfferPayload) =>
    apiFetch(`/orders/${orderId}/offers`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getOffers: (orderId: string) => apiFetch(`/orders/${orderId}/offers`),

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
    apiFetch(`/orders/${orderId}/offers/${offerId}`, {
      method: "DELETE",
    }),

  acceptOffer: (orderId: string, offerId: string) =>
    apiFetch(`/orders/${orderId}/offers/${offerId}/accept`, {
      method: "PUT",
    }),
};

//  Chat

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
  // All chat threads for the logged-in user
  getConversations: (): Promise<{
    success: boolean;
    conversations: Conversation[];
  }> => apiFetch("/chat/conversations"),

  // Message history for a specific order (also marks as read)
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

  // Total unread count across all chats — for navbar badge
  getUnreadCount: (): Promise<{ success: boolean; count: number }> =>
    apiFetch("/chat/unread-count"),

  // File/image upload (plain text goes through socket)
  sendFile: (
    orderId: string,
    receiverId: string,
    file: File,
    content?: string,
  ) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("receiverId", receiverId);
    if (content) formData.append("content", content);
    return fetch(`${API_BASE_URL}/chat/${orderId}/send`, {
      method: "POST",
      credentials: "include",
      body: formData,
    }).then((r) => r.json());
  },
};

//  Settings

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
  ): Promise<{ success: boolean; preferences: NotificationPreferences }> =>
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
