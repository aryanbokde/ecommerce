"use client";

import React, { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { formatDistanceToNow, format } from "date-fns";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Loader2,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ADMIN_BADGES_REFRESH } from "@/components/admin/AdminSidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

// Matches the shape returned by getErrorLogs / Prisma ErrorLog model
export interface ErrorLogEntry {
  id: string;
  level: string;
  message: string;
  stack: string | null;
  code: string | null;
  statusCode: number | null;
  userId: string | null;
  route: string | null;
  method: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  metadata: unknown;
  resolved: boolean;
  seenByAdmin: boolean;
  createdAt: Date | string;
}

export interface ErrorStats {
  total: number;
  unresolved: number;
  byLevel: { error: number; warn: number; info: number };
  trends: { last24h: number; last7d: number; last30d: number };
}

export interface LogsResult {
  items: ErrorLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Props {
  logsResult: LogsResult;
}

function LevelBadge({ level }: { level: string }) {
  if (level === "error")
    return <Badge variant="destructive">Error</Badge>;
  if (level === "warn")
    return (
      <Badge className="border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
        Warn
      </Badge>
    );
  return <Badge variant="default">Info</Badge>;
}

export default function ErrorLogsClient({ logsResult }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [locallySeen, setLocallySeen] = useState<Set<string>>(new Set());
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkResolving, setBulkResolving] = useState(false);
  const [, startTransition] = useTransition();

  const currentLevel = searchParams.get("level") ?? "all";
  const currentResolved = searchParams.get("resolved") ?? "all";
  const currentLimit = searchParams.get("limit") ?? "20";
  const currentPage = logsResult.page;
  const totalPages = logsResult.totalPages;
  const PER_PAGE_OPTIONS = [10, 20, 50, 100] as const;

  const pageIds = logsResult.items.map((l) => l.id);
  const allSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const someSelected = pageIds.some((id) => selected.has(id));
  const bulkBusy = bulkDeleting || bulkResolving;

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Bulk delete the selected ids (opens via the confirm dialog).
  async function handleBulkDelete() {
    setBulkDeleting(true);
    try {
      const res = await fetch("/api/admin/error-logs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected] }),
      });
      if (!res.ok) throw new Error("Failed");
      const json = await res.json().catch(() => null);
      toast.success(`Deleted ${json?.deleted ?? selected.size} error logs`);
      setSelected(new Set());
      setConfirmOpen(false);
      window.dispatchEvent(new Event(ADMIN_BADGES_REFRESH));
      router.refresh();
    } catch {
      toast.error("Failed to delete error logs");
    } finally {
      setBulkDeleting(false);
    }
  }

  // Bulk update resolved state for the selected ids.
  async function handleBulkResolve(resolved: boolean) {
    setBulkResolving(true);
    try {
      const res = await fetch("/api/admin/error-logs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected], resolved }),
      });
      if (!res.ok) throw new Error("Failed");
      const json = await res.json().catch(() => null);
      const n = json?.updated ?? selected.size;
      toast.success(
        `Marked ${n} log${n === 1 ? "" : "s"} ${resolved ? "resolved" : "open"}`
      );
      setSelected(new Set());
      window.dispatchEvent(new Event(ADMIN_BADGES_REFRESH));
      router.refresh();
    } catch {
      toast.error("Failed to update error logs");
    } finally {
      setBulkResolving(false);
    }
  }

  function buildHref(overrides: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(overrides)) {
      if (v === "all") {
        params.delete(k);
      } else {
        params.set(k, v);
      }
    }
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  function handleFilterChange(key: string, value: string | null) {
    const href = buildHref({ [key]: value ?? "all", page: "1" });
    startTransition(() => router.push(href));
  }

  // Expanding a log to read it counts as "seeing" it → clears it from the
  // sidebar's new-errors badge. Local set hides the "New" pill instantly.
  function markSeen(log: ErrorLogEntry) {
    if (log.seenByAdmin || locallySeen.has(log.id)) return;
    setLocallySeen((prev) => new Set(prev).add(log.id));
    void fetch(`/api/admin/error-logs/${log.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seen: true }),
    }).then((res) => {
      if (res.ok) window.dispatchEvent(new Event(ADMIN_BADGES_REFRESH));
    });
  }

  function toggleExpand(log: ErrorLogEntry) {
    const opening = expandedId !== log.id;
    setExpandedId(opening ? log.id : null);
    if (opening) markSeen(log);
  }

  async function handleResolve(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setPendingId(id);
    try {
      const res = await fetch(`/api/admin/error-logs/${id}`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error("Failed to resolve");
      toast.success("Error log marked as resolved");
      window.dispatchEvent(new Event(ADMIN_BADGES_REFRESH));
      router.refresh();
    } catch {
      toast.error("Failed to resolve error log");
    } finally {
      setPendingId(null);
    }
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setPendingId(id);
    try {
      const res = await fetch(`/api/admin/error-logs/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Error log deleted");
      window.dispatchEvent(new Event(ADMIN_BADGES_REFRESH));
      router.refresh();
    } catch {
      toast.error("Failed to delete error log");
    } finally {
      setPendingId(null);
    }
  }

  function getPageLinks() {
    const links: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) links.push(i);
    } else {
      links.push(1);
      if (currentPage > 3) links.push("ellipsis");
      for (
        let i = Math.max(2, currentPage - 1);
        i <= Math.min(totalPages - 1, currentPage + 1);
        i++
      ) {
        links.push(i);
      }
      if (currentPage < totalPages - 2) links.push("ellipsis");
      links.push(totalPages);
    }
    return links;
  }

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Level:</span>
          <Select
            value={currentLevel}
            onValueChange={(v) => handleFilterChange("level", v)}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="warn">Warning</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <Select
            value={currentResolved}
            onValueChange={(v) => handleFilterChange("resolved", v)}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="false">Unresolved</SelectItem>
              <SelectItem value="true">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Per page:</span>
          <Select
            value={currentLimit}
            onValueChange={(v) => handleFilterChange("limit", v)}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PER_PAGE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {selected.size > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button size="sm" variant="outline" disabled={bulkBusy} />
                }
              >
                {bulkBusy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <MoreHorizontal className="size-4" />
                )}
                Bulk actions ({selected.size})
                <ChevronDown className="size-3.5 opacity-60" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem
                  onClick={() => handleBulkResolve(true)}
                  disabled={bulkBusy}
                >
                  <CheckCircle2 className="size-4 text-green-600" />
                  Mark as resolved
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleBulkResolve(false)}
                  disabled={bulkBusy}
                >
                  <Circle className="size-4 text-muted-foreground" />
                  Mark as open
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setConfirmOpen(true)}
                  disabled={bulkBusy}
                >
                  <Trash2 className="size-4" />
                  Delete selected
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {selected.size > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelected(new Set())}
              disabled={bulkBusy}
            >
              Clear
            </Button>
          )}
          <span className="text-sm text-muted-foreground">
            {selected.size > 0
              ? `${selected.size} selected`
              : `${logsResult.total} total`}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl ring-1 ring-foreground/10 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <Checkbox
                  aria-label="Select all on page"
                  checked={allSelected}
                  indeterminate={someSelected && !allSelected}
                  onCheckedChange={toggleAll}
                  disabled={pageIds.length === 0}
                />
              </TableHead>
              <TableHead className="w-6" />
              <TableHead className="w-20">Level</TableHead>
              <TableHead>Message</TableHead>
              <TableHead className="w-40">Route</TableHead>
              <TableHead className="w-28">User</TableHead>
              <TableHead className="w-32">Time</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logsResult.items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="py-16 text-center"
                >
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="size-10 text-green-500" />
                    <p className="font-medium">No errors logged</p>
                    <p className="text-sm">
                      Everything looks good — no errors match your filters.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              logsResult.items.map((log) => (
                <React.Fragment key={log.id}>
                  <TableRow
                    className={`cursor-pointer select-none ${
                      !log.seenByAdmin && !locallySeen.has(log.id)
                        ? "bg-primary/[0.07] font-medium [&>td:first-child]:border-l-4 [&>td:first-child]:border-l-primary"
                        : ""
                    }`}
                    data-selected={selected.has(log.id) || undefined}
                    onClick={() => toggleExpand(log)}
                  >
                    <TableCell
                      className="pr-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        aria-label="Select log"
                        checked={selected.has(log.id)}
                        onCheckedChange={() => toggleRow(log.id)}
                      />
                    </TableCell>

                    <TableCell className="pr-0">
                      {expandedId === log.id ? (
                        <ChevronDown className="size-3.5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="size-3.5 text-muted-foreground" />
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <LevelBadge level={log.level} />
                        {!log.seenByAdmin && !locallySeen.has(log.id) && (
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                            New
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="max-w-xs">
                      <p className="truncate font-mono text-xs">{log.message}</p>
                      {log.code && (
                        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                          {log.code}
                          {log.statusCode ? ` · ${log.statusCode}` : ""}
                        </p>
                      )}
                    </TableCell>

                    <TableCell>
                      {log.route ? (
                        <span className="font-mono text-xs">
                          {log.method ? (
                            <span className="mr-1 text-muted-foreground">
                              {log.method}
                            </span>
                          ) : null}
                          {log.route}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    <TableCell>
                      <span className="font-mono text-xs">
                        {log.userId ? log.userId.slice(0, 8) + "…" : "—"}
                      </span>
                    </TableCell>

                    <TableCell>
                      <time
                        dateTime={new Date(log.createdAt).toISOString()}
                        title={format(
                          new Date(log.createdAt),
                          "yyyy-MM-dd HH:mm:ss"
                        )}
                        className="text-xs text-muted-foreground"
                      >
                        {formatDistanceToNow(new Date(log.createdAt), {
                          addSuffix: true,
                        })}
                      </time>
                    </TableCell>

                    <TableCell>
                      {log.resolved ? (
                        <Badge variant="outline" className="text-green-600">
                          Resolved
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Open</Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <div
                        className="flex items-center justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {!log.resolved && (
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            disabled={pendingId === log.id}
                            onClick={(e) => handleResolve(e, log.id)}
                            title="Mark as resolved"
                          >
                            <CheckCircle2 className="size-3.5 text-green-600" />
                          </Button>
                        )}
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          disabled={pendingId === log.id}
                          onClick={(e) => handleDelete(e, log.id)}
                          title="Delete"
                        >
                          <Trash2 className="size-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>

                  {expandedId === log.id && (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="bg-muted/40 py-4"
                      >
                        <div className="space-y-3 px-2">
                          {log.stack ? (
                            <div>
                              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Stack Trace
                              </p>
                              <pre className="max-h-48 overflow-auto rounded-lg bg-muted p-3 font-mono text-[11px] leading-relaxed">
                                {log.stack}
                              </pre>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              No stack trace recorded.
                            </p>
                          )}

                          {log.metadata != null && (
                            <div>
                              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Metadata
                              </p>
                              <pre className="max-h-32 overflow-auto rounded-lg bg-muted p-3 font-mono text-[11px] leading-relaxed">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </div>
                          )}

                          {log.userAgent && (
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium">User-Agent:</span>{" "}
                              {log.userAgent}
                            </p>
                          )}
                          {log.ipAddress && (
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium">IP:</span>{" "}
                              {log.ipAddress}
                            </p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href={buildHref({ page: String(Math.max(1, currentPage - 1)) })}
                aria-disabled={currentPage === 1}
                className={
                  currentPage === 1 ? "pointer-events-none opacity-50" : ""
                }
              />
            </PaginationItem>

            {getPageLinks().map((link, i) =>
              link === "ellipsis" ? (
                <PaginationItem key={`ellipsis-${i}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={link}>
                  <PaginationLink
                    href={buildHref({ page: String(link) })}
                    isActive={link === currentPage}
                  >
                    {link}
                  </PaginationLink>
                </PaginationItem>
              )
            )}

            <PaginationItem>
              <PaginationNext
                href={buildHref({
                  page: String(Math.min(totalPages, currentPage + 1)),
                })}
                aria-disabled={currentPage === totalPages}
                className={
                  currentPage === totalPages
                    ? "pointer-events-none opacity-50"
                    : ""
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* Bulk delete confirmation */}
      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => !bulkDeleting && setConfirmOpen(open)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {selected.size} error logs?</DialogTitle>
            <DialogDescription>
              This permanently removes the selected log entries. This can&apos;t
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
            >
              {bulkDeleting && <Loader2 className="size-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
