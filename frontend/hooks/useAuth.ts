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
          credentials: "include",
        });

        if (response.status === 401) {
          router.replace("/auth");
          return;
        }

        if (!response.ok) {
          throw new Error("Failed to verify session");
        }

        const user: AuthUser = await response.json();

        if (requiredRole && user.role !== requiredRole) {
          const correctDashboard =
            user.role === "manufacturer"
              ? "/manufacturer/dashboard"
              : "/logistics/dashboard";
          router.replace(correctDashboard);
          return;
        }

        setState({ user, loading: false, error: null });
      } catch {
        setState({
          user: null,
          loading: false,
          error: "Session verification failed",
        });
        router.replace("/auth");
      }
    }

    verifySession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requiredRole]); // ← router intentionally excluded: it's stable but including it
  //   causes repeated re-runs that unmount/remount children,
  //   resetting their state on every render cycle.

  return state;
}
