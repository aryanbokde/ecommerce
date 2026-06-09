"use client";

import React, { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { formatDistanceToNow, format } from "date-fns";
import { ChevronDown, ChevronRight, ScrollText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

// Matches the shape returned by getAuditLogs / Prisma AuditLog model.
export interface AuditLogEntry {
  id: string;
  userId: string | null;
  action: string;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: unknown;
  status: string;
  createdAt: Date | string;
}

export interface AuditLogsResult {
  items: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Props {
  logsResult: AuditLogsResult;
}

// All audit actions, for the filter dropdown.
const ACTIONS = [
  "login_success",
  "login_failed",
  "logout",
  "register",
  "email_verified",
  "password_reset_requested",
  "password_changed",
  "2fa_enabled",
  "2fa_disabled",
  "2fa_failed",
  "session_revoked",
  "account_banned",
  "account_unbanned",
  "role_changed",
  "profile_updated",
  "oauth_connected",
  "oauth_disconnected",
  "product_created",
  "product_updated",
  "product_deleted",
  "category_created",
  "category_updated",
  "category_deleted",
  "order_placed",
  "order_status_changed",
  "order_fulfilled",
  "order_note_added",
  "order_cancelled",
  "order_confirmation_resent",
  "payment_success",
  "payment_failed",
] as const;

function prettyAction(action: string) {
  return action
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function StatusBadge({ status }: { status: string }) {
  if (status === "success")
    return (
      <Badge className="border-transparent bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
        Success
      </Badge>
    );
  if (status === "failed") return <Badge variant="destructive">Failed</Badge>;
  if (status === "blocked")
    return (
      <Badge className="border-transparent bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
        Blocked
      </Badge>
    );
  return <Badge variant="secondary">{status}</Badge>;
}

export default function AuditLogsClient({ logsResult }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const currentAction = searchParams.get("action") ?? "all";
  const currentStatus = searchParams.get("status") ?? "all";
  const currentLimit = searchParams.get("limit") ?? "20";
  const currentPage = logsResult.page;
  const totalPages = logsResult.totalPages;
  const PER_PAGE_OPTIONS = [10, 20, 50, 100] as const;

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
          <span className="text-sm text-muted-foreground">Action:</span>
          <Select
            value={currentAction}
            onValueChange={(v) => handleFilterChange("action", v)}
          >
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all">All Actions</SelectItem>
              {ACTIONS.map((a) => (
                <SelectItem key={a} value={a}>
                  {prettyAction(a)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <Select
            value={currentStatus}
            onValueChange={(v) => handleFilterChange("status", v)}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
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

        <span className="ml-auto text-sm text-muted-foreground">
          {logsResult.total} total
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl ring-1 ring-foreground/10 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-6" />
              <TableHead className="w-48">Action</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-28">User</TableHead>
              <TableHead className="w-32">IP</TableHead>
              <TableHead className="w-32">Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logsResult.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <ScrollText className="size-10 text-muted-foreground/50" />
                    <p className="font-medium">No audit entries</p>
                    <p className="text-sm">
                      No activity matches your current filters.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              logsResult.items.map((log) => (
                <React.Fragment key={log.id}>
                  <TableRow
                    className="cursor-pointer select-none"
                    onClick={() =>
                      setExpandedId(expandedId === log.id ? null : log.id)
                    }
                  >
                    <TableCell className="pr-0">
                      {expandedId === log.id ? (
                        <ChevronDown className="size-3.5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="size-3.5 text-muted-foreground" />
                      )}
                    </TableCell>

                    <TableCell>
                      <span className="text-sm font-medium">
                        {prettyAction(log.action)}
                      </span>
                    </TableCell>

                    <TableCell>
                      <StatusBadge status={log.status} />
                    </TableCell>

                    <TableCell>
                      <span className="font-mono text-xs">
                        {log.userId ? log.userId.slice(0, 8) + "…" : "—"}
                      </span>
                    </TableCell>

                    <TableCell>
                      <span className="font-mono text-xs">
                        {log.ipAddress ?? "—"}
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
                  </TableRow>

                  {expandedId === log.id && (
                    <TableRow>
                      <TableCell colSpan={6} className="bg-muted/40 py-4">
                        <div className="space-y-3 px-2">
                          <div className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
                            <p className="text-muted-foreground">
                              <span className="font-medium text-foreground">
                                Full user id:
                              </span>{" "}
                              <span className="font-mono">
                                {log.userId ?? "—"}
                              </span>
                            </p>
                            <p className="text-muted-foreground">
                              <span className="font-medium text-foreground">
                                Entry id:
                              </span>{" "}
                              <span className="font-mono">{log.id}</span>
                            </p>
                          </div>

                          {log.metadata != null && (
                            <div>
                              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Metadata
                              </p>
                              <pre className="max-h-40 overflow-auto rounded-lg bg-muted p-3 font-mono text-[11px] leading-relaxed">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </div>
                          )}

                          {log.userAgent && (
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium text-foreground">
                                User-Agent:
                              </span>{" "}
                              {log.userAgent}
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
    </div>
  );
}
