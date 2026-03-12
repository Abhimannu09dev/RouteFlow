"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type AuthUser = {
  id: string;
  companyName: string;
  email: string;
  role: "manufacturer" | "logistics";
};

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
};

export function useAuth(
  requiredRole?: "manufacturer" | "logistics",
): AuthState {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    async function verifySession() {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          method: "GET",
          credentials: "include", // sends the HTTP-Only cookie automatically
        });

        // Not logged in at all — send to auth page
        if (response.status === 401) {
          router.replace("/auth");
          return;
        }

        if (!response.ok) {
          throw new Error("Failed to verify session");
        }

        const user: AuthUser = await response.json();

        // Logged in but wrong role — redirect to their correct dashboard
        if (requiredRole && user.role !== requiredRole) {
          const correctDashboard =
            user.role === "manufacturer"
              ? "/manufacturer/dashboard"
              : "/logistics/dashboard";
          router.replace(correctDashboard);
          return;
        }

        setState({ user, loading: false, error: null });
      } catch (err) {
        setState({
          user: null,
          loading: false,
          error: "Session verification failed",
        });
        router.replace("/auth");
      }
    }

    verifySession();
  }, [requiredRole, router]);

  return state;
}
