"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldAlert, Ban, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const ROLE_OPTIONS = [
  { value: "customer", label: "Customer" },
  { value: "shop_manager", label: "Shop Manager" },
  { value: "support", label: "Support" },
  { value: "admin", label: "Admin" },
];

interface UserRoleManagerProps {
  userId: string;
  currentRole: string;
  isActive: boolean;
}

export function UserRoleManager({
  userId,
  currentRole,
  isActive,
}: UserRoleManagerProps) {
  const router = useRouter();
  const { user } = useAuth();
  const isSelf = user?.id === userId;

  const [role, setRole] = useState(currentRole);
  const [targetRole, setTargetRole] = useState(currentRole);
  const [active, setActive] = useState(isActive);
  const [savingRole, setSavingRole] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [confirmAdmin, setConfirmAdmin] = useState(false);
  const [banOpen, setBanOpen] = useState(false);
  const [banReason, setBanReason] = useState("");

  async function patch(
    body: Record<string, unknown>
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => null);
      return { ok: res.ok, error: json?.error };
    } catch {
      return { ok: false, error: "Network error" };
    }
  }

  async function applyRole(next: string) {
    setSavingRole(true);
    const { ok, error } = await patch({ role: next });
    setSavingRole(false);
    if (!ok) {
      notifyError("Couldn't update role", error);
      return;
    }
    setRole(next);
    notifySuccess("Role updated", `Now ${next.replace("_", " ")}`);
    router.refresh();
  }

  function handleUpdateRole() {
    if (isSelf || savingRole || targetRole === role) return;
    if (targetRole === "admin" && role !== "admin") {
      setConfirmAdmin(true);
      return;
    }
    applyRole(targetRole);
  }

  async function applyStatus(nextActive: boolean, reason?: string) {
    setSavingStatus(true);
    const { ok, error } = await patch(
      nextActive ? { isActive: true } : { isActive: false, banReason: reason }
    );
    setSavingStatus(false);
    if (!ok) {
      notifyError(
        nextActive ? "Couldn't unban user" : "Couldn't ban user",
        error
      );
      return;
    }
    setActive(nextActive);
    notifySuccess(nextActive ? "User unbanned" : "User banned");
    setBanOpen(false);
    setBanReason("");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5 rounded-xl border border-border bg-card p-5">
      <h2 className="font-heading text-base font-semibold text-foreground">
        Role &amp; access
      </h2>

      {isSelf && (
        <p className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          <ShieldAlert className="size-4 shrink-0" />
          This is your own account — you can&apos;t change your role or status.
        </p>
      )}

      {/* Role */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Role</label>
        <div className="flex gap-2">
          <Select
            value={targetRole}
            onValueChange={(v) => setTargetRole(v ?? role)}
            disabled={isSelf}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleUpdateRole}
            disabled={isSelf || savingRole || targetRole === role}
          >
            {savingRole && <Loader2 className="size-4 animate-spin" />}
            Update Role
          </Button>
        </div>
      </div>

      {/* Status */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Status</label>
        <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
          <span className="text-sm">
            {active ? (
              <span className="font-medium text-green-600">Active</span>
            ) : (
              <span className="font-medium text-destructive">Banned</span>
            )}
          </span>
          {active ? (
            <Button
              variant="destructive"
              size="sm"
              disabled={isSelf || savingStatus}
              onClick={() => setBanOpen(true)}
            >
              <Ban className="size-4" />
              Ban User
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled={isSelf || savingStatus}
              onClick={() => applyStatus(true)}
            >
              {savingStatus ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ShieldCheck className="size-4" />
              )}
              Unban User
            </Button>
          )}
        </div>
      </div>

      {/* Promote-to-admin confirmation */}
      <Dialog open={confirmAdmin} onOpenChange={setConfirmAdmin}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Promote to admin?</DialogTitle>
            <DialogDescription>
              Admins have full access — managing products, orders, and other
              users (including changing roles and banning accounts). Only grant
              this to people you fully trust.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              disabled={savingRole}
              onClick={() => {
                setConfirmAdmin(false);
                applyRole("admin");
              }}
            >
              {savingRole && <Loader2 className="size-4 animate-spin" />}
              Make admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban reason dialog */}
      <Dialog open={banOpen} onOpenChange={setBanOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban this user?</DialogTitle>
            <DialogDescription>
              They will be deactivated and blocked from signing in. Add a reason
              for the record.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={3}
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
            placeholder="Reason for banning…"
          />
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              disabled={savingStatus || banReason.trim() === ""}
              onClick={() => applyStatus(false, banReason.trim())}
            >
              {savingStatus && <Loader2 className="size-4 animate-spin" />}
              Ban User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
