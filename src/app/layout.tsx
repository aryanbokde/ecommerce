import type { Metadata, Viewport } from "next";
import type { Organization, WithContext } from "schema-dts";
import { Geist, Geist_Mono, Inter, Poppins } from "next/font/google";
import { Toaster } from "sonner";
import JsonLd from "@/components/shared/JsonLd";
import { ThemeProvider } from "@/components/theme-provider";
import { setupGlobalErrorHandlers } from "@/lib/global-error-handler";
import "./globals.css";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// Org-level structured data for SEO (rendered site-wide).
const organizationSchema: WithContext<Organization> = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "MyShop",
  url: APP_URL,
  logo: `${APP_URL}/favicon.ico`,
  sameAs: [
    "https://github.com",
    "https://twitter.com",
    "https://instagram.com",
  ],
};

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

// Backend (Cyan dashboard) fonts — match dashboard-premium.html: Inter body,
// Poppins headings. Loaded globally as CSS vars; only APPLIED inside the
// `.theme-cyan` backend wrapper (see globals.css). Storefront keeps its font.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "600"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  applicationName: "MyShop",
  title: { template: "%s | MyShop", default: "MyShop — Your one-stop online store" },
  description:
    "Shop electronics, fashion, home & more at MyShop — fast delivery, secure checkout, easy returns.",
  keywords: ["ecommerce", "online shopping", "electronics", "fashion", "MyShop"],
  manifest: "/manifest.webmanifest",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "MyShop",
    url: APP_URL,
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
  icons: { icon: "/favicon.ico" },
};

// `themeColor` lives in the viewport export in Next 16 (not in metadata).
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${poppins.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <JsonLd schema={organizationSchema} />
          {children}
          <Toaster richColors closeButton position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
