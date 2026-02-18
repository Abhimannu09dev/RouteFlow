"use client";

import Image from "next/image";
import Link from "next/link";

export default function LandingNavbar() {
  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="component-px py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Company Name */}
          <Link href="/" className="flex items-center gap-3 group">
            <Image
              src="/logo.png"
              alt="RouteFlow Logo"
              width={40}
              height={40}
              className="transition-transform group-hover:scale-105"
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
            {/* <Link
              href="/auth?action=sign-in"
              className="px-4 py-2 text-sm font-medium text-grayish hover:text-blackish transition-colors"
            >
              Sign In
            </Link> */}
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
