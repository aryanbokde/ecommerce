import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Access Denied",
};

export default function ForbiddenPage() {
  return (
    <main
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden px-6 text-center"
      style={{
        background: "radial-gradient(120% 120% at 50% 0%, #14121d 0%, #08080c 60%)",
        fontFamily: "var(--font-body,'system-ui',sans-serif)",
        color: "#f4f4f7",
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute rounded-full"
        style={{
          width: 560,
          height: 560,
          background: "radial-gradient(circle, rgba(255,122,134,0.30), transparent 62%)",
          filter: "blur(70px)",
        }}
      />
      <div className="relative">
        <p
          className="text-[12px]"
          style={{ letterSpacing: "0.34em", textTransform: "uppercase", color: "#ff7a86" }}
        >
          Error 403
        </p>
        <h1
          className="mt-4"
          style={{ fontSize: "clamp(2.5rem,6vw,4rem)", fontWeight: 800, letterSpacing: "-0.03em" }}
        >
          Access denied
        </h1>
        <p className="mt-3 text-sm" style={{ color: "#9b9ba8", fontWeight: 300 }}>
          You don&apos;t have permission to view this page.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block"
          style={{
            padding: "0.8rem 1.6rem",
            fontSize: 12,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#fff",
            borderRadius: 12,
            background: "linear-gradient(100deg, #ff7a86, #8b6cff)",
          }}
        >
          Back home
        </Link>
      </div>
    </main>
  );
}
