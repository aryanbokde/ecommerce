"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { notifyError, notifySuccess } from "@/lib/notify";

interface ExistingReturn {
  status: string;
  reason: string;
  adminNote: string | null;
}

const STATUS_TEXT: Record<string, string> = {
  requested: "Return requested — awaiting review.",
  approved: "Return approved. Refund will follow if applicable.",
  rejected: "Return request was rejected.",
  completed: "Return completed.",
};

const STATUS_STYLES: Record<string, string> = {
  requested: "bg-orange-100 text-orange-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  completed: "bg-muted text-muted-foreground",
};

/** Customer-facing return control on the order detail page. */
export function CustomerReturn({
  orderId,
  canRequest,
  existing,
}: {
  orderId: string;
  canRequest: boolean;
  existing: ExistingReturn | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  // Nothing to show: no existing return AND the order can't be returned
  // (not delivered / returns disabled / window passed).
  if (!existing && !canRequest) return null;

  async function submit() {
    if (reason.trim().length < 5) {
      notifyError("Add a reason", "Tell us why you're returning (min 5 chars).");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        notifyError("Couldn't request return", json?.error);
        return;
      }
      notifySuccess("Return requested", "We'll review it shortly.");
      setOpen(false);
      router.refresh();
    } catch {
      notifyError("Something went wrong", "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (existing) {
    return (
      <div className="rounded-xl border border-border p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Undo2 className="size-4 text-muted-foreground" />
            Return
          </h2>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${
              STATUS_STYLES[existing.status] ?? "bg-muted text-muted-foreground"
            }`}
          >
            {existing.status}
          </span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {STATUS_TEXT[existing.status] ?? ""}
        </p>
        {existing.adminNote && (
          <p className="mt-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Note:</span>{" "}
            {existing.adminNote}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-foreground">
            Not happy with your order?
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Request a return — we&apos;ll review and get back to you.
          </p>
        </div>
        <Button variant="outline" onClick={() => setOpen(true)}>
          <Undo2 className="size-4" />
          Request return
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request a return</DialogTitle>
            <DialogDescription>
              Tell us why you want to return this order. Our team will review it.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for return…"
          />
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button onClick={submit} disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Submit request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
