"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquarePlus, XCircle, Mail } from "lucide-react";
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

const CANCELLABLE = new Set(["pending", "confirmed", "processing"]);

interface SupportOrderActionsProps {
  orderId: string;
  orderNumber: string;
  status: string;
}

type Body =
  | { action: "add_note"; note: string }
  | { action: "cancel"; reason: string }
  | { action: "resend_confirmation" };

export function SupportOrderActions({
  orderId,
  orderNumber,
  status,
}: SupportOrderActionsProps) {
  const router = useRouter();
  const [noteOpen, setNoteOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<null | Body["action"]>(null);

  const canCancel = CANCELLABLE.has(status);

  async function run(body: Body, onSuccess?: () => void) {
    setBusy(body.action);
    try {
      const res = await fetch(`/api/support/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        notifyError("Action failed", json?.error);
        return;
      }
      notifySuccess(json?.message ?? "Done", orderNumber);
      onSuccess?.();
      router.refresh();
    } catch {
      notifyError("Something went wrong", "Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="outline"
        className="justify-start"
        onClick={() => setNoteOpen(true)}
      >
        <MessageSquarePlus className="size-4" />
        Add note
      </Button>

      <Button
        variant="outline"
        className="justify-start"
        disabled={busy === "resend_confirmation"}
        onClick={() => run({ action: "resend_confirmation" })}
      >
        {busy === "resend_confirmation" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Mail className="size-4" />
        )}
        Resend confirmation
      </Button>

      <Button
        variant="outline"
        className="justify-start text-destructive hover:text-destructive"
        disabled={!canCancel}
        title={
          canCancel ? undefined : `A ${status} order can't be cancelled`
        }
        onClick={() => setCancelOpen(true)}
      >
        <XCircle className="size-4" />
        Cancel order
      </Button>
      {!canCancel && (
        <p className="text-xs text-muted-foreground">
          Cancellation is only available before an order ships.
        </p>
      )}

      {/* Add note dialog */}
      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add internal note</DialogTitle>
            <DialogDescription>
              Visible to staff only — the customer never sees support notes.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What happened, what you told the customer, next steps…"
          />
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              disabled={note.trim() === "" || busy === "add_note"}
              onClick={() =>
                run({ action: "add_note", note: note.trim() }, () => {
                  setNote("");
                  setNoteOpen(false);
                })
              }
            >
              {busy === "add_note" && <Loader2 className="size-4 animate-spin" />}
              Add note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel order {orderNumber}?</DialogTitle>
            <DialogDescription>
              This sets the order to cancelled and restocks its items. If payment
              was captured, it will be flagged for refund. This can&apos;t be
              undone.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for cancellation (recorded on the order)"
          />
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Keep order
            </DialogClose>
            <Button
              variant="destructive"
              disabled={reason.trim() === "" || busy === "cancel"}
              onClick={() =>
                run({ action: "cancel", reason: reason.trim() }, () => {
                  setReason("");
                  setCancelOpen(false);
                })
              }
            >
              {busy === "cancel" && <Loader2 className="size-4 animate-spin" />}
              Cancel order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
