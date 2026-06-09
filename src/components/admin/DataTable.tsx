"use client";

import { useState, type ReactNode } from "react";
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Inbox } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/shared/Pagination";
import { cn } from "@/lib/utils";

export interface Column<T> {
  /** Unique key; also the sort key passed to onSort, and the default value key. */
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  /** Custom cell renderer; defaults to String(row[key]). */
  render?: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  pagination?: { page: number; totalPages: number };
  onPageChange?: (page: number) => void;
  onSort?: (key: string, direction: "asc" | "desc") => void;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  /** Trailing per-row actions (rendered in a final column). */
  rowActions?: (row: T) => ReactNode;
  /** Extra className per row (e.g. highlight unseen/"new" rows). */
  rowClassName?: (row: T) => string | undefined;
  emptyMessage?: string;
  // ── Selection ──────────────────────────────────────────────────────────────
  /** Render a leading checkbox column for bulk selection. */
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  /** Bar shown above the table while one or more rows are selected. */
  bulkBar?: (selectedIds: string[]) => ReactNode;
  /** Extra controls (e.g. a category filter) rendered alongside the search box. */
  toolbar?: ReactNode;
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  isLoading = false,
  pagination,
  onPageChange,
  onSort,
  searchPlaceholder = "Search…",
  onSearch,
  rowActions,
  rowClassName,
  emptyMessage = "No results found.",
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  bulkBar,
  toolbar,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(
    null
  );

  const selected = new Set(selectedIds);
  const pageIds = data.map((d) => d.id);
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const someSelected = pageIds.some((id) => selected.has(id));

  const colSpan =
    columns.length + (rowActions ? 1 : 0) + (selectable ? 1 : 0);

  function toggleAll() {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(selectedIds.filter((id) => !pageIds.includes(id)));
    } else {
      onSelectionChange([...new Set([...selectedIds, ...pageIds])]);
    }
  }

  function toggleRow(id: string) {
    if (!onSelectionChange) return;
    onSelectionChange(
      selected.has(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id]
    );
  }

  function handleSort(col: Column<T>) {
    if (!col.sortable || !onSort) return;
    const dir: "asc" | "desc" =
      sort?.key === col.key && sort.dir === "asc" ? "desc" : "asc";
    setSort({ key: col.key, dir });
    onSort(col.key, dir);
  }

  function cellValue(col: Column<T>, row: T): ReactNode {
    if (col.render) return col.render(row);
    const v = (row as Record<string, unknown>)[col.key];
    return v == null ? "" : String(v);
  }

  return (
    <div className="flex flex-col gap-4">
      {(onSearch || toolbar) && (
        <div className="flex flex-wrap items-center gap-3">
          {onSearch && (
            <div className="relative max-w-xs flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                placeholder={searchPlaceholder}
                aria-label="Search"
                className="h-9 pl-8"
                onChange={(e) => {
                  setQuery(e.target.value);
                  onSearch(e.target.value);
                }}
              />
            </div>
          )}
          {toolbar}
        </div>
      )}

      {/* Bulk actions bar */}
      {selectable && bulkBar && selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2">
          <span className="text-sm font-medium">
            {selectedIds.length} selected
          </span>
          <div className="ml-auto flex items-center gap-2">
            {bulkBar(selectedIds)}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <Table>
          <TableHeader className="[&_tr]:bg-muted/40 [&_th]:text-xs [&_th]:font-semibold [&_th]:tracking-wide [&_th]:text-muted-foreground">
            <TableRow>
              {selectable && (
                <TableHead className="w-0">
                  <Checkbox
                    aria-label="Select all on page"
                    checked={allSelected}
                    indeterminate={someSelected && !allSelected}
                    onCheckedChange={toggleAll}
                    disabled={pageIds.length === 0}
                  />
                </TableHead>
              )}
              {columns.map((col) => {
                const sorted = sort?.key === col.key;
                return (
                  <TableHead key={col.key} className={col.className}>
                    {col.sortable && onSort ? (
                      <button
                        type="button"
                        onClick={() => handleSort(col)}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        {col.header}
                        {sorted ? (
                          sort!.dir === "asc" ? (
                            <ArrowUp className="size-3.5" />
                          ) : (
                            <ArrowDown className="size-3.5" />
                          )
                        ) : (
                          <ArrowUpDown className="size-3.5 text-muted-foreground/50" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </TableHead>
                );
              })}
              {rowActions && (
                <TableHead className="w-0 text-right">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              Array.from({ length: data.length || 5 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  {Array.from({ length: colSpan }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full max-w-[160px]" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colSpan} className="py-12">
                  <div className="flex flex-col items-center justify-center gap-2 text-center">
                    <Inbox className="size-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{emptyMessage}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => {
                const isSelected = selected.has(row.id);
                return (
                  <TableRow
                    key={row.id}
                    data-selected={isSelected || undefined}
                    className={cn(rowClassName?.(row))}
                  >
                    {selectable && (
                      <TableCell className="w-0">
                        <Checkbox
                          aria-label="Select row"
                          checked={isSelected}
                          onCheckedChange={() => toggleRow(row.id)}
                        />
                      </TableCell>
                    )}
                    {columns.map((col) => (
                      <TableCell key={col.key} className={cn(col.className)}>
                        {cellValue(col, row)}
                      </TableCell>
                    ))}
                    {rowActions && (
                      <TableCell className="text-right">
                        {rowActions(row)}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}
