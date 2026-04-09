"use client";

import Image from "next/image";
import Link from "next/link";

export default function LandingNavbar() {
  return (
    <nav className="bg-white dark:bg-[#272727] border-b border-gray-200 dark:border-[#3a3a38] sticky top-0 z-50 shadow-sm dark:shadow-[0_1px_8px_rgba(0,0,0,0.4)]">
      <div className="component-px py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Company Name */}
          <Link href="/" className="flex items-center gap-3 group">
            <Image
              src="/Logo.png"
              alt="RouteFlow Logo"
              width={40}
              height={40}
              className="transition-transform group-hover:scale-105 rounded-xl"
            />
            <div className="flex flex-col">
              <h1 className="text-xl font-semibold text-blackish">RouteFlow</h1>
              <p className="text-xs text-grayish hidden sm:block">
                Your gateway to quick and efficient transportation solutions
              </p>
            </div>
          </Link>

          {/* Auth Buttons */}
          <div className="flex items-center gap-3">
            <Link
              href="/auth?action=sign-up"
              className="px-5 py-2.5 text-sm font-medium text-white bg-primary hover:bg-primary-dark transition-colors rounded-lg"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
