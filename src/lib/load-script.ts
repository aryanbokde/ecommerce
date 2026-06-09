// Dynamically inject a <script> once and resolve when it's ready.
// Resolves true on load, false on error. Safe to call repeatedly — an existing
// tag for the same src is reused rather than duplicated.
export function loadScript(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve(false);
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${src}"]`
    );
    if (existing) {
      // Already finished loading in a previous call.
      if (existing.dataset.loaded === "true") {
        resolve(true);
        return;
      }
      // In flight — piggyback on its load/error.
      existing.addEventListener("load", () => resolve(true), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true";
        resolve(true);
      },
      { once: true }
    );
    script.addEventListener("error", () => resolve(false), { once: true });
    document.body.appendChild(script);
  });
}
