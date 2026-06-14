"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { notifyError, notifySuccess } from "@/lib/notify";

interface ReturnData {
  status: string; // requested | approved | rejected | completed
  reason: string;
  adminNote: string | null;
  restocked: boolean;
}

const STATUS_STYLES: Record<string, string> = {
  requested: "bg-orange-100 text-orange-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  completed: "bg-muted text-muted-foreground",
};

/** Admin review of a customer return request, shown on the order detail page. */
export function ReturnPanel({
  orderId,
  data,
  orderPaid,
}: {
  orderId: string;
  data: ReturnData;
  orderPaid: boolean;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [restock, setRestock] = useState(true);
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);

  async function resolve(action: "approve" | "reject") {
    setBusy(action);
    try {
      const res = await fetch(`/api/orders/${orderId}/return`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action,
          adminNote: note.trim() || undefined,
          restock: action === "approve" ? restock : undefined,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        notifyError("Couldn't update return", json?.error);
        return;
      }
      notifySuccess(action === "approve" ? "Return approved" : "Return rejected");
      router.refresh();
    } catch {
      notifyError("Something went wrong", "Please try again.");
    } finally {
      setBusy(null);
    }
  }

  const pending = data.status === "requested";

  return (
    <section className="rounded-xl border border-border p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Undo2 className="size-4 text-muted-foreground" />
          Return request
        </h2>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${
            STATUS_STYLES[data.status] ?? "bg-muted text-muted-foreground"
          }`}
        >
          {data.status}
        </span>
      </div>

      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Reason
      </p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
        {data.reason}
      </p>

      {data.adminNote && (
        <>
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Admin note
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
            {data.adminNote}
          </p>
        </>
      )}

      {pending ? (
        <div className="mt-4 space-y-3">
          <Textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note to record with this decision (optional)…"
          />
          <label className="flex items-center gap-2 text-sm text-foreground">
            <Checkbox
              checked={restock}
              onCheckedChange={(v) => setRestock(!!v)}
            />
            Restock items (add returned quantities back to inventory)
          </label>
          {orderPaid && (
            <p className="text-xs text-muted-foreground">
              Approving will flag this paid order as <b>refund pending</b>.
            </p>
          )}
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={busy !== null}
              onClick={() => resolve("approve")}
            >
              {busy === "approve" && <Loader2 className="size-4 animate-spin" />}
              Approve return
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy !== null}
              onClick={() => resolve("reject")}
            >
              {busy === "reject" && <Loader2 className="size-4 animate-spin" />}
              Reject
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          {data.status === "approved"
            ? `Approved${data.restocked ? " · items restocked" : ""}. Issue the refund below if pending.`
            : data.status === "rejected"
              ? "Return rejected."
              : "Return completed."}
        </p>
      )}
    </section>
  );
}
