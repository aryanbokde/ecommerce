"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, BadgeCheck } from "lucide-react";
import { DashboardShell } from "@/components/admin/DashboardShell";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CustomerRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  image: string | null;
  emailVerified: boolean;
  isActive: boolean;
  createdAt: string;
  orderCount: number;
}

interface Query {
  page: number;
  limit: number;
  search: string;
}

const PER_PAGE_OPTIONS = [10, 20, 50, 100] as const;

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

export default function CustomerLookupPage() {
  const [query, setQuery] = useState<Query>({ page: 1, limit: 20, search: "" });
  const [result, setResult] = useState<{
    key: string;
    customers: CustomerRow[];
    page: number;
    totalPages: number;
  } | null>(null);

  const key = JSON.stringify(query);
  const isLoading = result?.key !== key;

  useEffect(() => {
    const ctrl = new AbortController();
    const p = new URLSearchParams();
    p.set("page", String(query.page));
    p.set("limit", String(query.limit));
    if (query.search) p.set("search", query.search);

    fetch(`/api/support/customers?${p.toString()}`, {
      signal: ctrl.signal,
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
      .then((j) => {
        const d = j.data ?? {};
        setResult({
          key,
          customers: d.customers ?? [],
          page: d.page ?? 1,
          totalPages: d.totalPages ?? 1,
        });
      })
      .catch(() => {
        if (!ctrl.signal.aborted)
          setResult({ key, customers: [], page: 1, totalPages: 1 });
      });
    return () => ctrl.abort();
  }, [query, key]);

  const columns: Column<CustomerRow>[] = [
    {
      key: "name",
      header: "Customer",
      render: (c) => (
        <Link
          href={`/support/customers/${c.id}`}
          className="flex items-center gap-2.5"
        >
          <Avatar size="sm">
            {c.image ? <AvatarImage src={c.image} alt={c.name} /> : null}
            <AvatarFallback>{initials(c.name)}</AvatarFallback>
          </Avatar>
          <span className="font-medium hover:underline">{c.name}</span>
        </Link>
      ),
    },
    {
      key: "email",
      header: "Email",
      render: (c) => (
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          {c.email}
          {c.emailVerified && (
            <BadgeCheck
              className="size-3.5 text-green-600 dark:text-green-400"
              aria-label="Email verified"
            />
          )}
        </span>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      render: (c) => (
        <span className="tabular-nums text-muted-foreground">
          {c.phone ?? "—"}
        </span>
      ),
    },
    {
      key: "orders",
      header: "Orders",
      className: "text-right",
      render: (c) => (
        <span className="tabular-nums">{c.orderCount.toLocaleString("en-IN")}</span>
      ),
    },
    {
      key: "joined",
      header: "Joined",
      render: (c) => (
        <span className="text-muted-foreground">{fmtDate(c.createdAt)}</span>
      ),
    },
  ];

  return (
    <DashboardShell
      title="Customer Lookup"
      description="Find a shopper to view their orders and details — read-only"
    >
      <DataTable
        columns={columns}
        data={result?.customers ?? []}
        isLoading={isLoading}
        pagination={{ page: query.page, totalPages: result?.totalPages ?? 1 }}
        onPageChange={(page) => setQuery((q) => ({ ...q, page }))}
        searchPlaceholder="Search by name, email, or phone…"
        onSearch={(search) => setQuery((q) => ({ ...q, search, page: 1 }))}
        emptyMessage="No customers match your search."
        toolbar={
          <Select
            value={String(query.limit)}
            onValueChange={(v) =>
              setQuery((q) => ({ ...q, limit: Number(v) || 20, page: 1 }))
            }
          >
            <SelectTrigger className="h-9 w-32" aria-label="Customers per page">
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
        }
        rowActions={(c) => (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`View ${c.name}`}
            render={<Link href={`/support/customers/${c.id}`} />}
            nativeButton={false}
          >
            <Eye className="size-4" />
          </Button>
        )}
      />
    </DashboardShell>
  );
}
