import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { setupGlobalErrorHandlers } from "@/lib/global-error-handler";
import "./globals.css";

// Registers process.on("uncaughtException") and process.on("unhandledRejection")
// once per Node.js process. The guard inside prevents double-registration on
// hot-reloads. instrumentation.ts also calls this; the guard makes it idempotent.
setupGlobalErrorHandlers();

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: { template: "%s | MyShop", default: "MyShop" },
  description: "Your one-stop ecommerce store",
  openGraph: { type: "website", locale: "en_US" },
  robots: { index: true, follow: true },
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
          <nav aria-label="Main navigation" className="w-full border-b px-6 py-3" />
          {children}
          <Toaster richColors closeButton position="top-right" />
        </body>
    </html>
  );
}
