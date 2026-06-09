"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/**
 * Small label + monospace value with a copy-to-clipboard button. Used on the
 * order detail page to surface gateway ids (Razorpay payment_id / order_id) so
 * staff can reconcile against the payment gateway dashboard.
 */
export function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <button
        type="button"
        onClick={copy}
        title={`Copy ${label}`}
        className="flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-0.5 font-mono text-xs text-foreground hover:bg-muted"
      >
        <span className="truncate">{value}</span>
        {copied ? (
          <Check className="size-3.5 shrink-0 text-green-600" />
        ) : (
          <Copy className="size-3.5 shrink-0 text-muted-foreground" />
        )}
      </button>
    </div>
  );
}
