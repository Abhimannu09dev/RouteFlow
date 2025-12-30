"use client";

import { useRef, ChangeEvent, KeyboardEvent, useState, useEffect } from "react";

const VerifyAuth = () => {
  // OTP handling
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    if (value.length > 1) {
      e.target.value = value.slice(-1);
    }

    if (value && index < inputsRef.current.length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !e.currentTarget.value && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  //   Resend logic
  const [seconds, setSeconds] = useState(60);

  useEffect(() => {
    if (seconds > 0) {
      const timer = setTimeout(() => setSeconds(seconds - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [seconds]);

  const handleResend = () => {
    console.log("Resend clicked!");
    setSeconds(60); // Restart the timer after clicking resend
  };

  return (
    <div className="w-full flex flex-col items-center gap-3">
      <p className="text-lg font-medium">Check your inbox</p>
      <p className="text-blackish text-sm text-center">
        We&apos;ve sent a verification code to your.email@example.com.
      </p>

      <form className="w-full flex flex-col items-center gap-4 text-sm">
        <p>Enter the code above to continue.</p>
        <div id="inputs" className="flex gap-3 justify-center my-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <input
              key={i}
              ref={(el) => {
                inputsRef.current[i] = el;
              }}
              className="w-12 h-12 text-center bg-gray-100 border-none rounded-md text-lg font-semibold focus:outline-none focus:border-black"
              type="text"
              inputMode="numeric"
              maxLength={1}
              onChange={(e) => handleChange(i, e)}
              onKeyDown={(e) => handleKeyDown(i, e)}
            />
          ))}
        </div>
        <button
          type="submit"
          className="w-full p-3 rounded-md bg-primary hover:bg-primary-dark transition-all text-white"
        >
          Verify
        </button>
      </form>

      <div className="w-full flex items-center justify-center gap-2">
        <div className="w-full h-[1px] bg-gray-300"></div>
        <p className="text-[#C6C6C6E5] text-xs text-nowrap my-2">
          Did&apos;t get the code?
        </p>
        <div className="w-full h-[1px] bg-gray-300"></div>
      </div>
      <button
        onClick={handleResend}
        disabled={seconds > 0}
        className={`w-full p-3 rounded-md border-none text-sm font-medium text-center transition-all ${
          seconds > 0
            ? "bg-[#f2f2f2] border-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-[#e0e0e0] hover:bg-[#d6d6d6] border-gray-400 text-blackish cursor-pointer"
        }`}
      >
        {seconds > 0 ? `Resend in ${seconds} sec` : "Resend"}
      </button>
    </div>
  );
};

export default VerifyAuth;
