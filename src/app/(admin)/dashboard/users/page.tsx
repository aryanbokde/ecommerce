"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MoreHorizontal,
  Eye,
  ShieldCog,
  Ban,
  ShieldCheck,
  Check,
  Loader2,
} from "lucide-react";
import { DashboardShell } from "@/components/admin/DashboardShell";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
import { useAuth } from "@/hooks/useAuth";
import { notifyError, notifySuccess } from "@/lib/notify";
import { cn } from "@/lib/utils";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
}

const ROLE_TABS = [
  { value: "all", label: "All" },
  { value: "customer", label: "Customer" },
  { value: "shop_manager", label: "Shop Manager" },
  { value: "support", label: "Support" },
  { value: "admin", label: "Admin" },
];

const ROLE_LABEL: Record<string, string> = {
  customer: "Customer",
  shop_manager: "Shop Manager",
  support: "Support",
  admin: "Admin",
};

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-[#023047]/10 text-[#023047] dark:bg-[#8ECAE6]/15 dark:text-[#8ECAE6]",
  shop_manager: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  support: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  customer: "bg-muted text-muted-foreground",
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U"
  );
}

interface ServerFilters {
  page: number;
  limit: number;
  role: string; // "all" | role
  status: string; // "all" | "active" | "banned"
  search: string;
}

const PER_PAGE_OPTIONS = [10, 20, 50, 100] as const;

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [server, setServer] = useState<ServerFilters>({
    page: 1,
    limit: 20,
    role: "all",
    status: "all",
    search: "",
  });
  const [result, setResult] = useState<{
    key: string;
    users: AdminUser[];
    total: number;
    page: number;
    totalPages: number;
  } | null>(null);
  const [banTarget, setBanTarget] = useState<AdminUser | null>(null);
  const [banReason, setBanReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkBanOpen, setBulkBanOpen] = useState(false);
  const [bulkBanReason, setBulkBanReason] = useState("");

  const key = JSON.stringify(server);
  const isLoading = result?.key !== key;

  useEffect(() => {
    const ctrl = new AbortController();
    const p = new URLSearchParams();
    p.set("page", String(server.page));
    p.set("limit", String(server.limit));
    if (server.role !== "all") p.set("role", server.role);
    if (server.status !== "all")
      p.set("isActive", server.status === "active" ? "true" : "false");
    if (server.search) p.set("search", server.search);

    fetch(`/api/users?${p.toString()}`, {
      signal: ctrl.signal,
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
      .then((j) => {
        const d = j.data ?? {};
        setResult({
          key,
          users: d.users ?? [],
          total: d.total ?? 0,
          page: d.page ?? 1,
          totalPages: d.totalPages ?? 1,
        });
      })
      .catch(() => {
        if (!ctrl.signal.aborted)
          setResult({ key, users: [], total: 0, page: 1, totalPages: 1 });
      });
    return () => ctrl.abort();
  }, [server, key]);

  const bump = () => setServer((s) => ({ ...s }));

  async function patchStatus(u: AdminUser, body: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        notifyError("Action failed", json?.error);
        return false;
      }
      return true;
    } finally {
      setBusy(false);
    }
  }

  async function confirmBan() {
    if (!banTarget) return;
    const ok = await patchStatus(banTarget, {
      isActive: false,
      banReason: banReason.trim(),
    });
    if (ok) {
      notifySuccess("User banned", banTarget.name);
      setBanTarget(null);
      setBanReason("");
      bump();
    }
  }

  async function unban(u: AdminUser) {
    const ok = await patchStatus(u, { isActive: true });
    if (ok) {
      notifySuccess("User unbanned", u.name);
      bump();
    }
  }

  // Bulk ban/unban the selected users (parallel per-id PATCH). Skips the current
  // admin so you can never lock yourself out.
  async function bulkSetActive(ids: string[], active: boolean, reason?: string) {
    const targets = ids.filter((id) => id !== currentUser?.id);
    if (targets.length === 0) {
      notifyError("Nothing to update", "You can't ban your own account.");
      return;
    }
    setBusy(true);
    const results = await Promise.all(
      targets.map((id) =>
        fetch(`/api/users/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(
            active ? { isActive: true } : { isActive: false, banReason: reason?.trim() ?? "" }
          ),
        }).then((r) => r.ok)
      )
    );
    setBusy(false);
    const ok = results.filter(Boolean).length;
    if (ok > 0)
      notifySuccess(
        `${ok} ${ok === 1 ? "user" : "users"} ${active ? "unbanned" : "banned"}`
      );
    if (ok < targets.length)
      notifyError("Some updates failed", `${targets.length - ok} failed`);
    setSelectedIds([]);
    setBulkBanOpen(false);
    setBulkBanReason("");
    bump();
  }

  const columns: Column<AdminUser>[] = [
    {
      key: "avatar",
      header: "",
      className: "w-0",
      render: (u) => (
        <Avatar size="sm" className="ring-1 ring-border">
          {u.image ? <AvatarImage src={u.image} alt={u.name} /> : null}
          <AvatarFallback>{initials(u.name)}</AvatarFallback>
        </Avatar>
      ),
    },
    {
      key: "name",
      header: "User",
      render: (u) => (
        <Link
          href={`/dashboard/users/${u.id}`}
          className="font-medium hover:underline"
        >
          {u.name}
        </Link>
      ),
    },
    {
      key: "email",
      header: "Email",
      render: (u) => <span className="text-muted-foreground">{u.email}</span>,
    },
    {
      key: "role",
      header: "Role",
      render: (u) => (
        <Badge
          className={cn(
            "border-transparent",
            ROLE_BADGE[u.role] ?? "bg-muted text-muted-foreground"
          )}
        >
          {ROLE_LABEL[u.role] ?? u.role}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (u) =>
        u.isActive ? (
          <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700 dark:bg-green-500/15 dark:text-green-400">
            Active
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-500/15 dark:text-red-400">
            Banned
          </span>
        ),
    },
    {
      key: "emailVerified",
      header: "Verified",
      className: "text-center",
      render: (u) =>
        u.emailVerified ? (
          <Check className="mx-auto size-4 text-green-600" />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "createdAt",
      header: "Joined",
      className: "text-right",
      render: (u) => (
        <span className="text-muted-foreground">{fmtDate(u.createdAt)}</span>
      ),
    },
  ];

  return (
    <DashboardShell title="Users" description="Manage roles and access">
      <div className="flex flex-col gap-4">
        {/* Role filter tabs + result count */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs
            value={server.role}
            onValueChange={(v) =>
              setServer((s) => ({ ...s, role: v ?? "all", page: 1 }))
            }
          >
            <TabsList className="h-auto flex-wrap">
              {ROLE_TABS.map((r) => (
                <TabsTrigger key={r.value} value={r.value}>
                  {r.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {result && !isLoading && (
            <span className="text-sm text-muted-foreground">
              {result.total} {result.total === 1 ? "user" : "users"}
            </span>
          )}
        </div>

        <DataTable
          columns={columns}
          data={result?.users ?? []}
          isLoading={isLoading}
          pagination={{ page: server.page, totalPages: result?.totalPages ?? 1 }}
          onPageChange={(page) => setServer((s) => ({ ...s, page }))}
          searchPlaceholder="Search name or email…"
          onSearch={(search) => setServer((s) => ({ ...s, search, page: 1 }))}
          emptyMessage="No users match these filters."
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          bulkBar={(ids) => (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => bulkSetActive(ids, true)}
              >
                <ShieldCheck className="size-4" />
                Unban
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={busy}
                onClick={() => {
                  setBulkBanReason("");
                  setBulkBanOpen(true);
                }}
              >
                <Ban className="size-4" />
                Ban
              </Button>
            </>
          )}
          toolbar={
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={server.status}
                onValueChange={(v) =>
                  setServer((s) => ({ ...s, status: v ?? "all", page: 1 }))
                }
              >
                <SelectTrigger className="h-9 w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="banned">Banned</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={String(server.limit)}
                onValueChange={(v) =>
                  setServer((s) => ({ ...s, limit: Number(v) || 20, page: 1 }))
                }
              >
                <SelectTrigger className="h-9 w-32" aria-label="Users per page">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PER_PAGE_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} / page
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
          rowActions={(u) => {
            const isSelf = currentUser?.id === u.id;
            return (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="icon-sm" aria-label="Actions" />
                  }
                >
                  <MoreHorizontal className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-44">
                  <DropdownMenuItem render={<Link href={`/dashboard/users/${u.id}`} />}>
                    <Eye />
                    View details
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    render={<Link href={`/dashboard/users/${u.id}`} />}
                  >
                    <ShieldCog />
                    Change role
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {u.isActive ? (
                    <DropdownMenuItem
                      variant="destructive"
                      disabled={isSelf || busy}
                      onClick={() => {
                        setBanReason("");
                        setBanTarget(u);
                      }}
                    >
                      <Ban />
                      Ban user
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      disabled={isSelf || busy}
                      onClick={() => unban(u)}
                    >
                      <ShieldCheck />
                      Unban user
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          }}
        />
      </div>

      {/* Ban reason dialog */}
      <Dialog
        open={banTarget !== null}
        onOpenChange={(open) => {
          if (!open) setBanTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban {banTarget?.name}?</DialogTitle>
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
              disabled={busy || banReason.trim() === ""}
              onClick={confirmBan}
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              Ban user
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk ban dialog */}
      <Dialog
        open={bulkBanOpen}
        onOpenChange={(open) => !busy && setBulkBanOpen(open)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Ban {selectedIds.filter((id) => id !== currentUser?.id).length} users?
            </DialogTitle>
            <DialogDescription>
              They will be deactivated and blocked from signing in. Your own
              account is skipped. Add a reason for the record.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={3}
            value={bulkBanReason}
            onChange={(e) => setBulkBanReason(e.target.value)}
            placeholder="Reason for banning…"
          />
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              variant="destructive"
              disabled={busy || bulkBanReason.trim() === ""}
              onClick={() => bulkSetActive(selectedIds, false, bulkBanReason)}
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              Ban users
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
