"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import { authAPI } from "@/lib/api";

const CreatePassword = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const resetToken = searchParams.get("token");
    if (!resetToken) {
      toast.error("Invalid reset link");
      router.push("/auth?action=sign-in");
      return;
    }
    setToken(resetToken);
  }, [searchParams, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!password.trim()) {
        toast.error("Please enter a password");
        return;
      }

      if (password.length < 8) {
        toast.error("Password must be at least 8 characters long");
        return;
      }

      if (password !== confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }

      await authAPI.resetPassword(token, password, confirmPassword);
      toast.success("Password reset successfully!");
      router.push("/auth?action=sign-in");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to reset password";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center gap-3">
      <p className="text-lg font-semibold">Create a new password</p>
      <p className="text-blackish text-sm text-center">
        Your new password must be at least 8 characters long.
      </p>

      <form
        className="w-full flex flex-col gap-4 text-sm"
        onSubmit={handleSubmit}
      >
        <div>
          <label
            htmlFor="password"
            className="block font-medium mb-2"
            style={{ color: "var(--color-grayish)" }}
          >
            Password
          </label>
          <input
            type="password"
            id="password"
            placeholder="Please enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full bg-white rounded-lg p-3 border border-gray-300 placeholder-gray-400`}
            disabled={isLoading}
          />
        </div>
        <div>
          <label
            htmlFor="confirmPassword"
            className="block font-medium mb-2"
            style={{ color: "var(--color-grayish)" }}
          >
            Confirm Password
          </label>
          <input
            type="password"
            id="confirmPassword"
            placeholder="Please confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={`w-full bg-white rounded-lg p-3 border border-gray-300 placeholder-gray-400`}
            disabled={isLoading}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full p-3 rounded-md bg-primary hover:bg-primary-dark transition-all text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? "Resetting..." : "Reset Password"}
        </button>
      </form>

      <div className="w-full flex items-center justify-center gap-2">
        <div className="w-full h-[1px] bg-gray-300"></div>
        <p className="text-[#C6C6C6E5] text-xs text-nowrap my-2">
          Changed your mind?
        </p>
        <div className="w-full h-[1px] bg-gray-300"></div>
      </div>
      <div className="w-full flex items-center justify-center gap-2">
        <Link
          href="/auth?action=sign-in"
          className="w-full p-3 rounded-md bg-[#f2f2f2] border-gray-300 text-sm font-medium text-blackish hover:bg-[#e0e0e0] transition-all cursor-pointer text-center"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
};

export default CreatePassword;
