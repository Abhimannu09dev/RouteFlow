"use client";

import LandingNavbar from "@/components/landing/LandingNavbar";
import Link from "next/link";

const Homepage = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <LandingNavbar />
      <main className="flex-1 bg-gradient-to-br from-green-50 via-white to-blue-50 py-6 md:py-8 lg:py-12">
        <div className="flex flex-col items-center justify-center min-h-screen md:min-h-[100dvh] px-3 sm:px-4 md:px-6 overflow-hidden relative">
          {/* Decorative background elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none h-[150vh] w-full">
            <div className="absolute -top-32 -right-32 sm:-top-40 sm:-right-40 w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 bg-green-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
            <div className="absolute -bottom-32 -left-32 sm:-bottom-40 sm:-left-40 w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 bg-cyan-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
          </div>

          {/* Content */}
          <div className="relative z-10 w-full max-w-sm sm:max-w-xl md:max-w-2xl lg:max-w-4xl mx-auto text-center space-y-4 sm:space-y-6 md:space-y-8 py-4 sm:py-6 md:py-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-green-100 text-green-700 rounded-full text-xs sm:text-sm font-medium mb-2 sm:mb-3 md:mb-4 animate-fade-in">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Smart Logistics Made Simple
            </div>

            {/* Main Heading */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-900 leading-tight animate-fade-in-up">
              Optimize Your Delivery
              <span className="block bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mt-2">
                RouteFlow
              </span>
            </h1>

            {/* Description */}
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 max-w-xl sm:max-w-2xl mx-auto leading-relaxed animate-fade-in-up animation-delay-200">
              Connect logistics partners and manufacturers. Streamline your
              delivery operations and optimize routes. Start your journey with
              RouteFlow today.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-2 sm:pt-3 md:pt-4 w-full animate-fade-in-up animation-delay-400">
              <Link
                href="/auth?action=sign-up"
                className="group relative w-full sm:w-auto px-4 sm:px-8 py-2.5 sm:py-4 bg-gradient-to-r from-green-600 to-blue-600 text-white font-semibold text-sm sm:text-base rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Get Started
                  <svg
                    className="w-4 sm:w-5 h-4 sm:h-5 group-hover:translate-x-1 transition-transform duration-200"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-green-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
              </Link>

              <Link
                href="/auth"
                className="w-full sm:w-auto px-4 sm:px-8 py-2.5 sm:py-4 bg-white text-gray-700 font-semibold text-sm sm:text-base rounded-lg sm:rounded-xl shadow-md hover:shadow-lg border border-gray-200 hover:border-gray-300 transform hover:-translate-y-0.5 transition-all duration-200"
              >
                Sign In
              </Link>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6 pt-6 sm:pt-8 md:pt-12 w-full animate-fade-in-up animation-delay-600">
              <div className="bg-white/80 backdrop-blur-sm p-4 sm:p-5 md:p-6 rounded-lg sm:rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-200 border border-gray-100">
                <div className="w-10 sm:w-12 h-10 sm:h-12 bg-green-100 rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4 mx-auto">
                  <svg
                    className="w-5 sm:w-6 h-5 sm:h-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                  Smart Route Planning
                </h3>
                <p className="text-gray-600 text-xs sm:text-sm">
                  Optimize delivery routes and reduce costs with intelligent
                  planning
                </p>
              </div>

              <div className="bg-white/80 backdrop-blur-sm p-4 sm:p-5 md:p-6 rounded-lg sm:rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-200 border border-gray-100">
                <div className="w-10 sm:w-12 h-10 sm:h-12 bg-blue-100 rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4 mx-auto">
                  <svg
                    className="w-5 sm:w-6 h-5 sm:h-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                  Prper Order Management
                </h3>
                <p className="text-gray-600 text-xs sm:text-sm">
                  Keep track of your deliveries and ensure timely fulfillment
                </p>
              </div>

              <div className="bg-white/80 backdrop-blur-sm p-4 sm:p-5 md:p-6 rounded-lg sm:rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-200 border border-gray-100">
                <div className="w-10 sm:w-12 h-10 sm:h-12 bg-orange-100 rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4 mx-auto">
                  <svg
                    className="w-5 sm:w-6 h-5 sm:h-6 text-orange-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                  Cost Efficient
                </h3>
                <p className="text-gray-600 text-xs sm:text-sm">
                  Reduce fuel costs and improve profit margins with smart
                  logistics
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        @keyframes blob {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-blob {
          animation: blob 7s infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out;
        }

        .animation-delay-200 {
          animation-delay: 0.2s;
          animation-fill-mode: both;
        }

        .animation-delay-400 {
          animation-delay: 0.4s;
          animation-fill-mode: both;
        }

        .animation-delay-600 {
          animation-delay: 0.6s;
          animation-fill-mode: both;
        }
      `}</style>
    </div>
  );
};

export default Homepage;
