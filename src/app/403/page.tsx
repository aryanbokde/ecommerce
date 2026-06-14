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
        background: "radial-gradient(120% 120% at 50% 0%, #023047 0%, #021c2b 60%)",
        fontFamily: "var(--font-body,'system-ui',sans-serif)",
        color: "#eaf4f8",
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute rounded-full"
        style={{
          width: 560,
          height: 560,
          background: "radial-gradient(circle, rgba(251,133,0,0.28), transparent 62%)",
          filter: "blur(70px)",
        }}
      />
      <div className="relative">
        <p
          className="text-[12px]"
          style={{ letterSpacing: "0.34em", textTransform: "uppercase", color: "#fb8500" }}
        >
          Error 403
        </p>
        <h1
          className="mt-4"
          style={{ fontSize: "clamp(2.5rem,6vw,4rem)", fontWeight: 800, letterSpacing: "-0.03em" }}
        >
          Access denied
        </h1>
        <p className="mt-3 text-sm" style={{ color: "#8eb0c0", fontWeight: 300 }}>
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
            background: "linear-gradient(100deg, #fb8500, #e07700)",
          }}
        >
          Back home
        </Link>
      </div>
    </main>
  );
}
