import Link from "next/link";

/**
 * Shared chrome for every /auth/* page — a modern DARK split layout:
 *   • Left: an elevated dark brand panel (hidden on mobile)
 *   • Right: a clean form area on the darkest background; pages supply
 *     heading / form / footer as children via the shared helper classes
 *     (fld, btn-primary, btn-ghost, lnk).
 *
 * Palette (light form + navy brand panel):
 *   bg #f8fafb · panel(navy) #023047 · surface #ffffff
 *   Primary(orange) #fb8500 · Accent(blue) #219ebc · Success #16a34a
 *   text #023047 · muted #5b7280
 *
 * Server component (no client hooks).
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        :root {
          --bg:           #f8fafb;
          --panel:        #023047;
          --surface:      #ffffff;
          --surface-2:    #f1f6f8;
          --line:         #e2ebef;
          --line-strong:  #cdd9df;
          --text:         #023047;
          --ink:          #023047;
          --muted:        #5b7280;
          --primary:      #fb8500;
          --primary-press:#e07700;
          --accent:       #219ebc;
          --accent-press: #1b86a0;
          --success:      #16a34a;
        }
        @keyframes auth-panel-in {
          from { opacity: 0; transform: translateX(-24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes auth-rise {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes auth-fade { from { opacity: 0; } to { opacity: 1; } }
        .auth-stagger > * { animation: auth-rise 0.65s cubic-bezier(0.16,1,0.3,1) both; }
        .auth-stagger > *:nth-child(1) { animation-delay: 0.26s; }
        .auth-stagger > *:nth-child(2) { animation-delay: 0.33s; }
        .auth-stagger > *:nth-child(3) { animation-delay: 0.40s; }
        .auth-stagger > *:nth-child(4) { animation-delay: 0.47s; }
        .auth-stagger > *:nth-child(5) { animation-delay: 0.54s; }
        .auth-stagger > *:nth-child(6) { animation-delay: 0.61s; }

        .fld {
          width: 100%;
          padding: 0.8rem 0.95rem;
          font-family: var(--font-body,'system-ui',sans-serif);
          font-size: 0.9rem;
          color: var(--text);
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 12px;
          outline: none;
          transition: border-color .2s, background .2s, box-shadow .2s;
        }
        .fld::placeholder { color: #5b6675; }
        .fld:focus {
          border-color: var(--accent);
          background: var(--surface-2);
          box-shadow: 0 0 0 4px rgba(33,158,188,0.18);
        }
        .fld-label {
          display: block;
          font-family: var(--font-body,'system-ui',sans-serif);
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--muted);
          margin-bottom: 0.5rem;
        }
        .btn-primary {
          width: 100%;
          padding: 0.9rem;
          font-family: var(--font-body,'system-ui',sans-serif);
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #ffffff;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          background: var(--primary);
          box-shadow: 0 10px 26px -10px rgba(251,133,0,0.55);
          transition: transform .22s cubic-bezier(0.16,1,0.3,1), background .2s, box-shadow .22s;
        }
        .btn-primary:hover {
          background: var(--primary-press);
          transform: translateY(-2px);
          box-shadow: 0 16px 34px -12px rgba(251,133,0,0.7);
        }
        .btn-primary:active { transform: translateY(0); }
        .btn-ghost {
          width: 100%;
          padding: 0.78rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          font-family: var(--font-body,'system-ui',sans-serif);
          font-size: 0.85rem;
          color: var(--ink);
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 12px;
          cursor: pointer;
          transition: background .2s, border-color .2s;
        }
        .btn-ghost:hover { background: var(--surface-2); border-color: var(--line-strong); }
        .lnk {
          color: var(--accent);
          font-weight: 500;
          text-decoration: none;
          transition: opacity .2s;
        }
        .lnk:hover { opacity: 0.72; }
      `}</style>

      <main
        className="fixed inset-0 z-50 flex overflow-hidden"
        style={{ background: "var(--bg)", color: "var(--text)", fontFamily: "var(--font-body,'system-ui',sans-serif)" }}
      >
        {/* ── Left brand panel (elevated dark) ──────────────────── */}
        <section
          aria-label="MyShop"
          className="relative hidden lg:flex flex-col justify-between overflow-hidden px-14 py-14 xl:px-16"
          style={{
            width: "48%",
            background: "var(--panel)",
            color: "#fff",
            borderRight: "1px solid var(--line)",
            animation: "auth-panel-in 0.8s cubic-bezier(0.16,1,0.3,1) both",
          }}
        >
          {/* Decorative concentric outline rings (solid borders, no gradient) */}
          {([520, 380, 250] as const).map((size, i) => (
            <div
              key={size}
              aria-hidden="true"
              className="absolute pointer-events-none rounded-full"
              style={{
                width: size,
                height: size,
                top: -(size * 0.3),
                right: -(size * 0.34),
                border: `1px solid rgba(255,255,255,${0.12 - i * 0.03})`,
              }}
            />
          ))}

          {/* Wordmark */}
          <div className="relative z-10 flex items-center gap-2.5">
            <span
              aria-hidden="true"
              style={{ width: 22, height: 22, borderRadius: 7, background: "var(--primary)", display: "inline-block" }}
            />
            <span className="text-[11px]" style={{ letterSpacing: "0.34em", textTransform: "uppercase", fontWeight: 500 }}>
              MyShop
            </span>
          </div>

          {/* Hero */}
          <div className="relative z-10">
            <p
              className="text-[10px] mb-6"
              style={{ letterSpacing: "0.26em", textTransform: "uppercase", color: "var(--muted)", animation: "auth-fade 1s 0.3s both" }}
            >
              The Marketplace
            </p>
            <h1
              style={{
                fontFamily: "var(--font-display,'system-ui',sans-serif)",
                fontSize: "clamp(2.6rem, 4vw, 3.9rem)",
                lineHeight: 1.04,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                animation: "auth-rise 0.85s 0.2s cubic-bezier(0.16,1,0.3,1) both",
              }}
            >
              Where
              <br />
              discovery
              <br />
              meets desire.
            </h1>

            {/* Accent rule */}
            <div
              aria-hidden="true"
              style={{ width: 48, height: 3, background: "var(--accent)", borderRadius: 2, margin: "1.75rem 0", animation: "auth-fade 0.9s 0.5s both" }}
            />

            <div className="flex flex-wrap gap-2" style={{ animation: "auth-rise 0.8s 0.46s both" }}>
              {["Fashion", "Home & Living", "Jewellery", "Beauty"].map((cat, i) => (
                <span
                  key={cat}
                  className="text-[9px] px-3 py-1.5"
                  style={{
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    borderRadius: 999,
                    // First chip filled with Primary to bring the orange onto the navy panel
                    ...(i === 0
                      ? { background: "var(--primary)", color: "#ffffff", border: "1px solid var(--primary)" }
                      : { color: "rgba(255,255,255,0.86)", border: "1px solid var(--line-strong)" }),
                  }}
                >
                  {cat}
                </span>
              ))}
            </div>
          </div>

          {/* Social proof */}
          <div className="relative z-10 flex items-center gap-3" style={{ animation: "auth-fade 1s 0.7s both" }}>
            <div className="flex -space-x-2" aria-hidden="true">
              {(["#3b4250", "#4a5160", "#3f4856", "#525a68"] as const).map((bg, i) => (
                <div
                  key={i}
                  className="rounded-full flex-shrink-0"
                  style={{ width: 28, height: 28, background: bg, border: "2px solid var(--panel)" }}
                />
              ))}
            </div>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--muted)" }}>
              <span
                aria-hidden="true"
                style={{ width: 7, height: 7, borderRadius: 999, background: "var(--success)", boxShadow: "0 0 0 3px rgba(34,197,94,0.25)" }}
              />
              Join 2M+ shoppers worldwide
            </div>
          </div>
        </section>

        {/* ── Right form panel (darkest bg) ─────────────────────── */}
        <section
          aria-label="Form"
          className="flex-1 flex flex-col justify-center items-center overflow-y-auto px-8 py-12 md:px-14"
          style={{ background: "var(--bg)" }}
        >
          <div
            className="w-full"
            style={{ maxWidth: 380, animation: "auth-rise 0.8s 0.15s cubic-bezier(0.16,1,0.3,1) both" }}
          >
            {/* Mobile brand */}
            <Link href="/" className="lg:hidden mb-10 inline-flex items-center gap-2.5" style={{ color: "var(--ink)" }}>
              <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: 7, background: "var(--primary)", display: "inline-block" }} />
              <span className="text-[11px]" style={{ letterSpacing: "0.34em", textTransform: "uppercase", fontWeight: 500 }}>
                MyShop
              </span>
            </Link>

            {children}
          </div>
        </section>
      </main>
    </>
  );
}
