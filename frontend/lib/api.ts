const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Helper to reduce repetition
async function apiFetch(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include", // ← sends cookies automatically
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
      // cookie is set automatically by the browser from the server response
    }),

  forgotPassword: (email: string) =>
    apiFetch("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
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
