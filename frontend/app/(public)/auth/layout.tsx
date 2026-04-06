"use client";

import Image from "next/image";
import { ToastContainer } from "react-toastify";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="w-full flex flex-col items-center justify-center min-h-dvh p-3 bg-[#F1F1F1]">
      <Image
        src="/Logo.png"
        alt="logo"
        width={50}
        height={50}
        className="rounded-xl"
      />
      <h1 className="text-2xl font-semibold mt-1 text-[#252C32]">RouteFlow</h1>
      <h2 className="text-[#838383] text-sm font-medium">
        Your gateway to quick and reliable deliveries
      </h2>
      <div className="w-full bg-white rounded-2xl md:rounded-3xl min-w-sm max-w-lg my-6 min-h-100 p-3 sm:p-6 md:p-8 border border-[#E5E9EB]">
        {children}
      </div>
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={true}
        newestOnTop={true}
        closeOnClick
      />
    </div>
  );
}
