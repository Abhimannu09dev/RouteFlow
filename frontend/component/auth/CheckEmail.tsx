"use client";

import MailSent from "@/assets/MailSent.svg";
import Image from "next/image";
import { useState, useEffect } from "react";

const PasswordCreate = () => {
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
      <p className="text-lg font-semibold">Check your inbox</p>
      <div className="text-blackish text-sm text-center">
        <p>We&apos;ve sent a reset link to your.email@example.com.</p>
        <p> It&apos;ll expire in 15 minutes.</p>
      </div>
      <Image src={MailSent} alt="Mail Sent" width={300} height={300} />

      <div className="w-full flex items-center justify-center gap-2">
        <button
          onClick={handleResend}
          disabled={seconds > 0}
          className={`w-full p-3 rounded-md border-none text-sm font-medium text-center transition-all ${
            seconds > 0
              ? "bg-[#7DE1E0] border-none text-white cursor-not-allowed"
              : "bg-primary hover:bg-[#2B9897] border-gray-400 text-white cursor-pointer"
          }`}
        >
          {seconds > 0 ? `Resend in ${seconds} sec` : "Resend"}
        </button>
      </div>
    </div>
  );
};

export default PasswordCreate;
