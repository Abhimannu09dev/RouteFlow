"use client";

import Link from "next/link";

const ResetPassword = () => {
  return (
    <div className="w-full flex flex-col items-center gap-3">
      <p className="text-lg font-semibold">Reset your password</p>
      <div className="text-blackish text-sm text-center">
        <p>Enter the email you used to sign up.</p>
        <p>We&apos;ll send you a link to reset your password.</p>
      </div>

      <form className="w-full flex flex-col gap-4 text-sm">
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
            className={`w-full bg-white rounded-lg p-3 border border-gray-300 placeholder-black`}
          />
        </div>
      </form>
      <button
        type="submit"
        className="w-full p-3 rounded-md bg-primary hover:bg-primary-dark transition-all text-white"
      >
        Send Reset Link
      </button>

      <div className="w-full flex items-center justify-center gap-2">
        <div className="w-full h-[1px] bg-gray-300"></div>
        <p className="text-[#C6C6C6E5] text-xs text-nowrap my-2">
          Remembered it?
        </p>
        <div className="w-full h-[1px] bg-gray-300"></div>
      </div>
      <div className="w-full flex items-center justify-center gap-2">
        <Link
          href="/auth"
          className="w-full p-3 rounded-md bg-[#f2f2f2] border-gray-300 text-sm font-medium text-blackish hover:bg-[#e0e0e0] transition-all cursor-pointer text-center"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
};

export default ResetPassword;
