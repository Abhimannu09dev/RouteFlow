"use client";

import Link from "next/link";

const CreatePassword = () => {
  return (
    <div className="w-full flex flex-col items-center gap-3">
      <p className="text-lg font-semibold">Create a new password</p>
      <p className="text-blackish text-sm text-center">
        Your new password must be at least 8 characters long.
      </p>

      <form className="w-full flex flex-col gap-4 text-sm">
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
            className={`w-full bg-white rounded-lg p-3 border border-gray-300 placeholder-black`}
          />
        </div>
        <div>
          <label
            htmlFor="ConfirmPassword"
            className="block font-medium mb-2"
            style={{ color: "var(--color-grayish)" }}
          >
            Confirm Password
          </label>
          <input
            type="password"
            id="ConfirmPassword"
            placeholder="Please enter your password"
            className={`w-full bg-white rounded-lg p-3 border border-gray-300 placeholder-black`}
          />
        </div>
      </form>
      <button
        type="submit"
        className="w-full p-3 rounded-md bg-primary hover:bg-primary-dark transition-all text-white"
      >
        Reset Password
      </button>

      <div className="w-full flex items-center justify-center gap-2">
        <div className="w-full h-[1px] bg-gray-300"></div>
        <p className="text-[#C6C6C6E5] text-xs text-nowrap my-2">
          Changed your mind?
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

export default CreatePassword;
