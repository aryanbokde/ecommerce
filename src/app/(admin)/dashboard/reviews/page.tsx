"use client";

import { useEffect, useState } from "react";
import {
  Star,
  Eye,
  EyeOff,
  CheckCheck,
  Trash2,
  MoreHorizontal,
  ImageIcon,
  Loader2,
} from "lucide-react";
import { DashboardShell } from "@/components/admin/DashboardShell";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
import { cn } from "@/lib/utils";
import { ADMIN_BADGES_REFRESH } from "@/components/admin/AdminSidebar";

interface AdminReview {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  isVisible: boolean;
  seenByAdmin: boolean;
  createdAt: string;
  product: { id: string; name: string; images: string[] | null } | null;
  user: { id: string; name: string | null; email: string } | null;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });


function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex" aria-label={`${rating} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "size-3.5",
            i < rating
              ? "fill-amber-400 text-amber-400"
              : "fill-muted text-muted-foreground/40"
          )}
        />
      ))}
    </span>
  );
}

interface ServerFilters {
  page: number;
  limit: number;
  visibility: string; // "all" | "visible" | "hidden"
  rating: string; // "all" | "1".."5"
  search: string;
}

const PER_PAGE_OPTIONS = [10, 20, 50, 100] as const;

export default function ReviewsPage() {
  const [server, setServer] = useState<ServerFilters>({
    page: 1,
    limit: 20,
    visibility: "all",
    rating: "all",
    search: "",
  });
  const [result, setResult] = useState<{
    key: string;
    reviews: AdminReview[];
    page: number;
    totalPages: number;
  } | null>(null);
  const [viewTarget, setViewTarget] = useState<AdminReview | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminReview | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const key = JSON.stringify(server);
  const isLoading = result?.key !== key;

  useEffect(() => {
    const ctrl = new AbortController();
    const p = new URLSearchParams();
    p.set("page", String(server.page));
    p.set("limit", String(server.limit));
    if (server.visibility !== "all")
      p.set("isVisible", server.visibility === "visible" ? "true" : "false");
    if (server.rating !== "all") p.set("rating", server.rating);
    if (server.search) p.set("search", server.search);

    fetch(`/api/reviews?${p.toString()}`, {
      signal: ctrl.signal,
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
      .then((j) => {
        const d = j.data ?? {};
        setResult({
          key,
          reviews: d.reviews ?? [],
          page: d.page ?? 1,
          totalPages: d.totalPages ?? 1,
        });
      })
      .catch(() => {
        if (!ctrl.signal.aborted)
          setResult({ key, reviews: [], page: 1, totalPages: 1 });
      });
    return () => ctrl.abort();
  }, [server, key]);

  const bump = () => setServer((s) => ({ ...s }));

  // Mark a review as seen by admin → it's no longer "new", so the sidebar
  // badge (count of unseen) drops. Fire-and-forget; refresh the list + badge.
  async function markSeen(review: AdminReview) {
    if (review.seenByAdmin) return;
    const res = await fetch(`/api/reviews/${review.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ seen: true }),
    });
    if (res.ok) {
      window.dispatchEvent(new Event(ADMIN_BADGES_REFRESH));
      bump();
    }
  }

  // Opening a review to read it counts as "seeing" it.
  function openReview(review: AdminReview) {
    setViewTarget(review);
    void markSeen(review);
  }

  async function setVisible(review: AdminReview, isVisible: boolean) {
    const res = await fetch(`/api/reviews/${review.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ isVisible }),
    });
    if (res.ok) {
      notifySuccess(isVisible ? "Review shown" : "Review hidden");
      bump();
    } else {
      const j = await res.json().catch(() => null);
      notifyError("Couldn't update review", j?.error);
    }
  }

  // Bulk delete the selected reviews (parallel per-id DELETE).
  async function handleBulkDelete() {
    setBulkDeleting(true);
    const results = await Promise.all(
      selectedIds.map((id) =>
        fetch(`/api/reviews/${id}`, {
          method: "DELETE",
          credentials: "include",
        }).then((r) => r.ok)
      )
    );
    setBulkDeleting(false);
    const ok = results.filter(Boolean).length;
    if (ok > 0) notifySuccess(`${ok} ${ok === 1 ? "review" : "reviews"} deleted`);
    if (ok < selectedIds.length)
      notifyError("Some deletes failed", `${selectedIds.length - ok} failed`);
    window.dispatchEvent(new Event(ADMIN_BADGES_REFRESH));
    setBulkDeleteOpen(false);
    setSelectedIds([]);
    bump();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    const res = await fetch(`/api/reviews/${deleteTarget.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    setBusy(false);
    if (res.ok) {
      notifySuccess("Review deleted");
      setDeleteTarget(null);
      // Deleting a recent review changes the "new last 7d" count → refresh badge.
      window.dispatchEvent(new Event(ADMIN_BADGES_REFRESH));
      bump();
    } else {
      const j = await res.json().catch(() => null);
      notifyError("Couldn't delete review", j?.error);
    }
  }

  const columns: Column<AdminReview>[] = [
    {
      key: "product",
      header: "Product",
      render: (r) => {
        const src = r.product?.images?.[0];
        return (
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
              {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt="" className="size-full object-cover" />
              ) : (
                <ImageIcon className="size-4 text-muted-foreground" />
              )}
            </span>
            <span className="max-w-[12rem] truncate font-medium">
              {r.product?.name ?? "—"}
            </span>
          </div>
        );
      },
    },
    {
      key: "customer",
      header: "Customer",
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate text-foreground">{r.user?.name ?? "—"}</p>
          <p className="truncate text-xs text-muted-foreground">
            {r.user?.email}
          </p>
        </div>
      ),
    },
    {
      key: "rating",
      header: "Rating",
      render: (r) => <Stars rating={r.rating} />,
    },
    {
      key: "content",
      header: "Review",
      render: (r) => (
        <div className="max-w-xs">
          {r.title && (
            <p className="truncate text-sm font-medium text-foreground">
              {r.title}
            </p>
          )}
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {r.body ?? "—"}
          </p>
        </div>
      ),
    },
    {
      key: "isVisible",
      header: "Visible",
      render: (r) => (
        <Switch
          checked={r.isVisible}
          onCheckedChange={(v) => setVisible(r, v)}
          aria-label="Toggle visibility"
        />
      ),
    },
    {
      key: "createdAt",
      header: "Date",
      className: "text-right",
      render: (r) => (
        <div className="flex items-center justify-end gap-2">
          {!r.seenByAdmin && (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
              New
            </span>
          )}
          <span className="text-muted-foreground">{fmtDate(r.createdAt)}</span>
        </div>
      ),
    },
  ];

  return (
    <DashboardShell
      title="Reviews"
      description="Moderate customer reviews — hide spam or abusive content"
    >
      <div className="flex flex-col gap-4">
        {/* Visibility filter tabs */}
        <Tabs
          value={server.visibility}
          onValueChange={(v) =>
            setServer((s) => ({ ...s, visibility: v ?? "all", page: 1 }))
          }
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="visible">Visible</TabsTrigger>
            <TabsTrigger value="hidden">Hidden</TabsTrigger>
          </TabsList>
        </Tabs>

        <DataTable
          columns={columns}
          data={result?.reviews ?? []}
          rowClassName={(r) =>
            r.seenByAdmin
              ? undefined
              : "bg-primary/[0.07] font-medium [&>td:first-child]:border-l-4 [&>td:first-child]:border-l-primary"
          }
          isLoading={isLoading}
          pagination={{ page: server.page, totalPages: result?.totalPages ?? 1 }}
          onPageChange={(page) => setServer((s) => ({ ...s, page }))}
          searchPlaceholder="Search product or review text…"
          onSearch={(search) => setServer((s) => ({ ...s, search, page: 1 }))}
          emptyMessage="No reviews match these filters."
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          bulkBar={(ids) => (
            <Button
              size="sm"
              variant="destructive"
              disabled={bulkDeleting}
              onClick={() => setBulkDeleteOpen(true)}
            >
              <Trash2 className="size-4" />
              Delete ({ids.length})
            </Button>
          )}
          toolbar={
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={server.rating}
                onValueChange={(v) =>
                  setServer((s) => ({ ...s, rating: v ?? "all", page: 1 }))
                }
              >
                <SelectTrigger className="h-9 w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All ratings</SelectItem>
                  {[5, 4, 3, 2, 1].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} {n === 1 ? "star" : "stars"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={String(server.limit)}
                onValueChange={(v) =>
                  setServer((s) => ({ ...s, limit: Number(v) || 20, page: 1 }))
                }
              >
                <SelectTrigger className="h-9 w-32" aria-label="Reviews per page">
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
          rowActions={(r) => (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon-sm" aria-label="Actions" />
                }
              >
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-40">
                <DropdownMenuItem onClick={() => openReview(r)}>
                  <Eye />
                  View full review
                </DropdownMenuItem>
                {!r.seenByAdmin && (
                  <DropdownMenuItem onClick={() => markSeen(r)}>
                    <CheckCheck />
                    Mark as seen
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setVisible(r, !r.isVisible)}>
                  <EyeOff />
                  {r.isVisible ? "Hide" : "Show"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setDeleteTarget(r)}
                >
                  <Trash2 />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        />
      </div>

      {/* View full review */}
      <Dialog
        open={viewTarget !== null}
        onOpenChange={(open) => {
          if (!open) setViewTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{viewTarget?.product?.name ?? "Review"}</DialogTitle>
            <DialogDescription>
              {viewTarget?.user?.name ?? "—"} · {viewTarget?.user?.email}
            </DialogDescription>
          </DialogHeader>
          {viewTarget && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Stars rating={viewTarget.rating} />
                <span className="text-xs text-muted-foreground">
                  {fmtDate(viewTarget.createdAt)}
                </span>
                {!viewTarget.isVisible && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    Hidden
                  </span>
                )}
              </div>
              {viewTarget.title && (
                <p className="font-medium text-foreground">{viewTarget.title}</p>
              )}
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {viewTarget.body ?? "No review text."}
              </p>
            </div>
          )}
          <DialogFooter>
            {viewTarget && (
              <Button
                variant="outline"
                onClick={() => {
                  setVisible(viewTarget, !viewTarget.isVisible);
                  setViewTarget(null);
                }}
              >
                {viewTarget.isVisible ? "Hide review" : "Show review"}
              </Button>
            )}
            <DialogClose render={<Button />}>Close</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete review?</DialogTitle>
            <DialogDescription>
              This permanently removes the review. To temporarily remove it from
              the storefront, hide it instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button variant="destructive" disabled={busy} onClick={confirmDelete}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk delete confirmation */}
      <Dialog
        open={bulkDeleteOpen}
        onOpenChange={(open) => !bulkDeleting && setBulkDeleteOpen(open)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {selectedIds.length} reviews?</DialogTitle>
            <DialogDescription>
              This permanently removes the selected reviews. To hide them from
              the storefront instead, use Hide.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              disabled={bulkDeleting}
              onClick={handleBulkDelete}
            >
              {bulkDeleting && <Loader2 className="size-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
