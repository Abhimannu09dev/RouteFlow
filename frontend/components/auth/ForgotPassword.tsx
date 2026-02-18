"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "react-toastify";
import { authAPI } from "@/lib/api";

const ResetPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!email.trim()) {
        toast.error("Please enter your email");
        return;
      }

      await authAPI.forgotPassword(email);
      toast.success("Reset link sent to your email!");
      setIsSubmitted(true);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to send reset link";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="w-full flex flex-col items-center gap-3">
        <p className="text-lg font-semibold">Check your inbox</p>
        <p className="text-blackish text-sm text-center">
          We&apos;ve sent a password reset link to <strong>{email}</strong>
        </p>
        <p className="text-blackish text-sm text-center mt-4">
          Please check your email and click the link to reset your password.
        </p>

        <div className="w-full flex items-center justify-center gap-2 my-6">
          <div className="w-full h-[1px] bg-gray-300"></div>
          <p className="text-[#C6C6C6E5] text-xs text-nowrap">Remember it?</p>
          <div className="w-full h-[1px] bg-gray-300"></div>
        </div>

        <Link
          href="/auth?action=sign-in"
          className="w-full p-3 rounded-md bg-[#f2f2f2] border-gray-300 text-sm font-medium text-blackish hover:bg-[#e0e0e0] transition-all cursor-pointer text-center"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center gap-3">
      <p className="text-lg font-semibold">Reset your password</p>
      <div className="text-blackish text-sm text-center">
        <p>Enter the email you used to sign up.</p>
        <p>We&apos;ll send you a link to reset your password.</p>
      </div>

      <form
        className="w-full flex flex-col gap-4 text-sm"
        onSubmit={handleSubmit}
      >
        <div>
          <label
            htmlFor="email"
            className="block font-medium mb-2"
            style={{ color: "var(--color-grayish)" }}
          >
            Email
          </label>
          <input
            type="email"
            id="email"
            placeholder="Please enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full bg-white rounded-lg p-3 border border-gray-300 placeholder-gray-400`}
            disabled={isLoading}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full p-3 rounded-md bg-primary hover:bg-primary-dark transition-all text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? "Sending..." : "Send Reset Link"}
        </button>
      </form>

      <div className="w-full flex items-center justify-center gap-2">
        <div className="w-full h-[1px] bg-gray-300"></div>
        <p className="text-[#C6C6C6E5] text-xs text-nowrap my-2">
          Remembered it?
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

export default ResetPassword;
