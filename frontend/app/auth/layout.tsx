"use client";

import Image from "next/image";
import { ToastContainer } from "react-toastify";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="w-full flex flex-col items-center justify-center min-h-[100dvh] p-3">
      <Image src="/logo.png" alt="logo" width={50} height={50} />
      <h1 className="text-2xl font-semibold mt-1">RouteFlow</h1>
      <h2 className="text-grayish text-sm font-medium">
        Your gateway to quick and reliable deliveries
      </h2>
      <div className="w-full bg-white rounded-2xl md:rounde-3xl min-w-sm max-w-lg my-6 min-h-[400px] p-3 sm:p-6 md:p-8">
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
