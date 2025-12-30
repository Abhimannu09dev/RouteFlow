import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "@/app/globals.css";
import NextTopLoader from "nextjs-toploader";

export const metadata: Metadata = {
  title: "RouteFlow",
  description: "RouteFlow - Your gateway to quick and reliable deliveries",
};

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${manrope.className} bg-[#F1F1F1]`}>
        <NextTopLoader
          color="#29935c"
          initialPosition={0.08}
          crawlSpeed={100}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="linear"
          speed={100}
          shadow="0 0 10px #29935c,0 0 5px #29935c"
          template='<div class="bar" role="bar"><div class="peg"></div></div> 
         <div class="spinner" role="spinner"><div class="spinner-icon"></div></div>'
          zIndex={1600}
          showAtBottom={false}
        />
        {children}
      </body>
    </html>
  );
}
