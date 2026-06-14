"use client";

import { useEffect, useState } from "react";
import { Plus, MapPin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AddressForm } from "./AddressForm";
import { useCheckout } from "@/hooks/useCheckout";
import { cn } from "@/lib/utils";
import type { Address } from "@/types";

export function AddressStep() {
  const selectedAddressId = useCheckout((s) => s.selectedAddressId);
  const setAddress = useCheckout((s) => s.setAddress);
  const setStep = useCheckout((s) => s.setStep);

  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Load saved addresses; auto-select the default (or first) if none chosen yet.
  // All setState lives in the async fn (never synchronously in the effect body).
  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const res = await fetch("/api/addresses", { credentials: "include" });
        const json = res.ok ? await res.json() : null;
        if (cancelled) return;
        const list: Address[] = json?.data ?? [];
        setAddresses(list);
        if (!useCheckout.getState().selectedAddressId && list.length > 0) {
          setAddress((list.find((a) => a.isDefault) ?? list[0]).id);
        }
      } catch {
        if (!cancelled) setAddresses([]);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [reloadKey, setAddress]);

  function handleCreated(address: Address) {
    setDialogOpen(false);
    setAddress(address.id);
    setReloadKey((k) => k + 1); // re-fetch so the new card appears
  }

  // ── Loading ──
  if (addresses === null) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  // ── Empty ──
  if (addresses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border py-16 text-center">
        <MapPin className="size-10 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium text-foreground">
            No saved addresses
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add a delivery address to continue.
          </p>
        </div>
        <AddNewAddressDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSuccess={handleCreated}
        />
      </div>
    );
  }

  // ── List + selection ──
  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">
        Delivery address
      </h2>

      <RadioGroup
        value={selectedAddressId ?? ""}
        onValueChange={(value) => setAddress(value as string)}
        className="gap-3"
      >
        {addresses.map((address) => {
          const selected = address.id === selectedAddressId;
          return (
            <label
              key={address.id}
              className={cn(
                "flex cursor-pointer gap-3 rounded-lg border p-4 transition-colors",
                selected
                  ? "border-primary ring-1 ring-primary"
                  : "border-border hover:border-foreground/30"
              )}
            >
              <RadioGroupItem value={address.id} className="mt-0.5" />
              <div className="min-w-0 flex-1">
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
                <p className="mt-1 text-sm text-foreground">{address.fullName}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {[address.line1, address.line2, address.city, address.state, address.postalCode, address.country]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {address.phone}
                </p>
              </div>
            </label>
          );
        })}
      </RadioGroup>

      <AddNewAddressDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleCreated}
      />

      <div className="flex border-t border-border pt-5 sm:justify-end">
        <Button
          size="lg"
          className="w-full sm:w-auto"
          disabled={!selectedAddressId}
          onClick={() => setStep("payment")}
        >
          Continue to Payment
          <ArrowRight />
        </Button>
      </div>
    </div>
  );
}

function AddNewAddressDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (address: Address) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button variant="outline" />}>
        <Plus />
        Add new address
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a new address</DialogTitle>
        </DialogHeader>
        <AddressForm
          onSuccess={onSuccess}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
