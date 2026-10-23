import type { Metadata } from "next";
import { Host_Grotesk, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const host = Host_Grotesk({ variable: "--font-host", subsets: ["latin"], weight: ["500", "600"] });

export const metadata: Metadata = {
  title: "Smart Content",
  description: "Research outlier videos and write short-form scripts.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${host.variable} antialiased`}>
      <body className="min-h-dvh font-sans text-[14px] leading-5">{children}</body>
    </html>
  );
}
