"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Star, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { AddressForm } from "@/components/checkout/AddressForm";
import { cn } from "@/lib/utils";
import { notifySuccess, notifyError } from "@/lib/notify";
import type { Address } from "@/types";

export function AddressesTab() {
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [deleting, setDeleting] = useState<Address | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const res = await fetch("/api/addresses", { credentials: "include" });
        const json = res.ok ? await res.json() : null;
        if (!cancelled) setAddresses(json?.data ?? []);
      } catch {
        if (!cancelled) setAddresses([]);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const refresh = () => setReloadKey((k) => k + 1);

  async function setDefault(address: Address) {
    setBusyId(address.id);
    try {
      const res = await fetch(`/api/addresses/${address.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isDefault: true }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        notifyError("Couldn't update default", json?.error);
        return;
      }
      notifySuccess("Default address updated");
      refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusyId(deleting.id);
    try {
      const res = await fetch(`/api/addresses/${deleting.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        notifyError("Couldn't delete address", json?.error);
        return;
      }
      notifySuccess("Address deleted");
      setDeleting(null);
      refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (addresses === null) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {addresses.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border py-14 text-center">
          <MapPin className="size-9 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No saved addresses yet.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {addresses.map((address) => {
            const busy = busyId === address.id;
            return (
              <li
                key={address.id}
                className={cn(
                  "rounded-lg border p-4",
                  address.isDefault ? "border-primary" : "border-border"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {address.label}
                      </span>
                      {address.isDefault && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-foreground">
                      {address.fullName}
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {[address.line1, address.line2, address.city, address.state, address.postalCode, address.country]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {address.phone}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                  {!address.isDefault && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => setDefault(address)}
                    >
                      {busy ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <Star />
                      )}
                      Set default
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditing(address)}
                  >
                    <Pencil />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => setDeleting(address)}
                  >
                    <Trash2 />
                    Delete
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Add new */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogTrigger render={<Button variant="outline" className="self-start" />}>
          <Plus />
          Add new address
        </DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add a new address</DialogTitle>
          </DialogHeader>
          <AddressForm
            onSuccess={() => {
              setAddOpen(false);
              notifySuccess("Address added");
              refresh();
            }}
            onCancel={() => setAddOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit address</DialogTitle>
          </DialogHeader>
          {editing && (
            <AddressForm
              editId={editing.id}
              defaultValues={{
                label: editing.label,
                fullName: editing.fullName,
                phone: editing.phone,
                line1: editing.line1,
                line2: editing.line2 ?? "",
                city: editing.city,
                state: editing.state,
                postalCode: editing.postalCode,
                country: editing.country,
                isDefault: editing.isDefault,
              }}
              onSuccess={() => {
                setEditing(null);
                notifySuccess("Address updated");
                refresh();
              }}
              onCancel={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this address?</DialogTitle>
            <DialogDescription>
              {deleting?.label} — {deleting?.fullName}. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={busyId === deleting?.id}
            >
              {busyId === deleting?.id && <Loader2 className="animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
