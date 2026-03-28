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

// ── Auth ──────────────────────────────────────────────────────────────────────

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

// ── Orders ────────────────────────────────────────────────────────────────────

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

  updateStatus: (orderId: string, status: string) =>
    apiFetch(`/orders/${orderId}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),
};

// ── Price Offers ──────────────────────────────────────────────────────────────

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
