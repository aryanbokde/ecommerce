"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StickyNote, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { notifyError, notifySuccess } from "@/lib/notify";

export interface OrderNote {
  id: string;
  note: string;
  createdAt: string;
  author: { id: string; name: string | null } | null;
}

interface OrderNotesPanelProps {
  orderId: string;
  initialNotes: OrderNote[];
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const initials = (name: string | null) =>
  (name ?? "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

// Internal staff notes on an order (never shown to the customer). Reuses the
// support endpoint, which is gated to support + admin — so admins can post too.
export function OrderNotesPanel({ orderId, initialNotes }: OrderNotesPanelProps) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  async function add() {
    const note = draft.trim();
    if (!note) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/support/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "add_note", note }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        notifyError("Couldn't add note", json?.error);
        return;
      }
      notifySuccess("Note added");
      setDraft("");
      router.refresh();
    } catch {
      notifyError("Something went wrong", "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-border p-5">
      <h2 className="flex items-center gap-2 text-sm font-medium text-foreground">
        <StickyNote className="size-4 text-muted-foreground" />
        Internal notes
        {initialNotes.length > 0 && (
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground tabular-nums">
            {initialNotes.length}
          </span>
        )}
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Visible to staff only — not the customer.
      </p>

      {/* Composer */}
      <div className="mt-3 flex flex-col gap-2">
        <Textarea
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a note for the team…"
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              void add();
            }
          }}
        />
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">⌘/Ctrl + Enter</span>
          <Button size="sm" onClick={add} disabled={saving || !draft.trim()}>
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            Add note
          </Button>
        </div>
      </div>

      {/* Thread */}
      {initialNotes.length > 0 && (
        <ul className="mt-4 flex flex-col gap-3">
          {initialNotes.map((n) => (
            <li key={n.id} className="flex gap-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                {initials(n.author?.name ?? null)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-xs">
                  <span className="font-medium text-foreground">
                    {n.author?.name ?? "Staff"}
                  </span>
                  <span className="text-muted-foreground">{fmt(n.createdAt)}</span>
                </p>
                <p className="mt-0.5 whitespace-pre-wrap text-sm text-foreground">
                  {n.note}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
