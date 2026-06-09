"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  ChevronUp,
  ChevronDown,
  Pencil,
  Trash2,
  Loader2,
  FolderTree,
} from "lucide-react";
import { DashboardShell } from "@/components/admin/DashboardShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CategoryForm, type FlatCategory } from "@/components/admin/CategoryForm";
import { notifyError, notifySuccess } from "@/lib/notify";

interface TreeRow {
  cat: FlatCategory;
  depth: number;
  isFirst: boolean;
  isLast: boolean;
}

// Effective parent key: null for top-level or a dangling parent reference.
function parentKeyOf(cat: FlatCategory, idset: Set<string>): string | null {
  return cat.parentId && idset.has(cat.parentId) ? cat.parentId : null;
}

function buildRows(cats: FlatCategory[]): TreeRow[] {
  const idset = new Set(cats.map((c) => c.id));
  const childrenOf = new Map<string | null, FlatCategory[]>();
  for (const c of cats) {
    const key = parentKeyOf(c, idset);
    const arr = childrenOf.get(key) ?? [];
    arr.push(c);
    childrenOf.set(key, arr);
  }
  // Each group is already ordered by the API (sortOrder, then name).
  const rows: TreeRow[] = [];
  const walk = (key: string | null, depth: number) => {
    const group = childrenOf.get(key) ?? [];
    group.forEach((c, i) => {
      rows.push({
        cat: c,
        depth,
        isFirst: i === 0,
        isLast: i === group.length - 1,
      });
      walk(c.id, depth + 1);
    });
  };
  walk(null, 0);
  return rows;
}

export default function CategoriesPage() {
  const [cats, setCats] = useState<FlatCategory[] | null>(null);
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formInitial, setFormInitial] = useState<FlatCategory | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<FlatCategory | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/admin/categories", {
      signal: ctrl.signal,
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
      .then((j) => setCats(j.data ?? []))
      .catch(() => {
        if (!ctrl.signal.aborted) setCats([]);
      });
    return () => ctrl.abort();
  }, [tick]);

  const bump = () => setTick((t) => t + 1);

  async function putCategory(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/categories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    return res.ok;
  }

  async function toggleActive(cat: FlatCategory, next: boolean) {
    const ok = await putCategory(cat.id, { isActive: next });
    if (ok) {
      notifySuccess(next ? "Category activated" : "Category hidden", cat.name);
      bump();
    } else {
      notifyError("Couldn't update category");
    }
  }

  async function move(cat: FlatCategory, dir: "up" | "down") {
    const all = cats ?? [];
    const idset = new Set(all.map((c) => c.id));
    const key = parentKeyOf(cat, idset);
    const siblings = all
      .filter((c) => parentKeyOf(c, idset) === key)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

    const i = siblings.findIndex((c) => c.id === cat.id);
    const j = dir === "up" ? i - 1 : i + 1;
    if (j < 0 || j >= siblings.length) return;
    [siblings[i], siblings[j]] = [siblings[j], siblings[i]];

    // Normalise the whole group to its new index; PUT only what changed.
    const updates = siblings
      .map((c, idx) => ({ id: c.id, sortOrder: idx, prev: c.sortOrder }))
      .filter((u) => u.prev !== u.sortOrder);

    setBusy(true);
    const results = await Promise.all(
      updates.map((u) => putCategory(u.id, { sortOrder: u.sortOrder }))
    );
    setBusy(false);
    if (results.every(Boolean)) bump();
    else notifyError("Couldn't reorder categories");
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    const res = await fetch(`/api/categories/${deleteTarget.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    setBusy(false);
    if (res.ok) {
      notifySuccess("Category deleted", deleteTarget.name);
      setDeleteTarget(null);
      bump();
    } else {
      const j = await res.json().catch(() => null);
      // e.g. "Cannot delete category: N product(s) are still attached"
      notifyError("Couldn't delete category", j?.error);
    }
  }

  function openCreate() {
    setFormMode("create");
    setFormInitial(undefined);
    setFormOpen(true);
  }
  function openEdit(cat: FlatCategory) {
    setFormMode("edit");
    setFormInitial(cat);
    setFormOpen(true);
  }

  const rows = cats ? buildRows(cats) : [];

  return (
    <DashboardShell
      title="Categories"
      description="Organise your catalog into a category tree"
      action={
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          Add Category
        </Button>
      }
    >
      <div className="rounded-lg border border-border">
        {cats === null ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-3">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="ml-auto h-5 w-20" />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <FolderTree className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No categories yet. Add your first one.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map(({ cat, depth, isFirst, isLast }) => (
              <li
                key={cat.id}
                className="flex items-center gap-3 px-3 py-2.5"
                style={{ paddingLeft: 12 + depth * 22 }}
              >
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate font-medium text-foreground">
                    {depth > 0 && (
                      <span className="text-muted-foreground/60">└</span>
                    )}
                    {cat.name}
                    {!cat.isActive && (
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        Hidden
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    /{cat.slug}
                  </p>
                </div>

                <Badge variant="secondary" className="shrink-0">
                  {cat.productCount}{" "}
                  {cat.productCount === 1 ? "product" : "products"}
                </Badge>

                <Switch
                  checked={cat.isActive}
                  onCheckedChange={(v) => toggleActive(cat, v)}
                  aria-label={`Toggle ${cat.name} active`}
                />

                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Move up"
                    disabled={isFirst || busy}
                    onClick={() => move(cat, "up")}
                  >
                    <ChevronUp className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Move down"
                    disabled={isLast || busy}
                    onClick={() => move(cat, "down")}
                  >
                    <ChevronDown className="size-4" />
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Edit"
                  onClick={() => openEdit(cat)}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Delete"
                  onClick={() => setDeleteTarget(cat)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Create / edit dialog (fresh mount per open for clean defaults) */}
      {formOpen && (
        <CategoryForm
          key={formInitial?.id ?? "new"}
          open
          onOpenChange={setFormOpen}
          mode={formMode}
          initialData={formInitial}
          categories={cats ?? []}
          onSaved={bump}
        />
      )}

      {/* Delete confirmation */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete “{deleteTarget?.name}”?</DialogTitle>
            <DialogDescription>
              This permanently deletes the category. It will fail if any products
              are still attached — reassign them first.
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
    </DashboardShell>
  );
}
