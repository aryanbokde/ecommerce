"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pencil,
  Eye,
  Send,
  Loader2,
  Mail,
  Search,
  Power,
  PowerOff,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { DashboardShell } from "@/components/admin/DashboardShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { notifySuccess, notifyError } from "@/lib/notify";
import {
  EmailTemplateEditor,
  type EmailTemplateDTO,
} from "@/components/admin/EmailTemplateEditor";

type Category = "auth" | "order" | "admin";
type Grouped = Record<Category, EmailTemplateDTO[]>;

interface DeliveryStat {
  sent: number;
  failed: number;
  skipped: number;
  total: number;
  lastSentAt: string | null;
}
type StatsMap = Record<string, DeliveryStat>;

const TABS: { value: Category; label: string }[] = [
  { value: "auth", label: "Auth" },
  { value: "order", label: "Order" },
  { value: "admin", label: "Admin" },
];

// Compact "x ago" for the last-sent timestamp.
function timeAgo(iso: string | null): string | null {
  if (!iso) return null;
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export default function EmailTemplatesPage() {
  const [data, setData] = useState<Grouped>({ auth: [], order: [], admin: [] });
  const [stats, setStats] = useState<StatsMap>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Category>("auth");
  const [search, setSearch] = useState("");
  const [bulkCat, setBulkCat] = useState<Category | null>(null);

  const [editing, setEditing] = useState<EmailTemplateDTO | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorKey, setEditorKey] = useState(0); // remounts the editor per open

  const [previewTpl, setPreviewTpl] = useState<EmailTemplateDTO | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");

  const [busyKey, setBusyKey] = useState<string | null>(null); // toggle in-flight
  const [testingKey, setTestingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/email-templates", {
        credentials: "include",
      });
      const json = await res.json();
      if (json?.data) setData(json.data as Grouped);
      if (json?.stats) setStats(json.stats as StatsMap);
    } catch {
      notifyError("Couldn't load templates");
    } finally {
      setLoading(false);
    }
  }, []);

  // Defer the initial fetch to a timer callback so no setState runs
  // synchronously inside the effect body.
  useEffect(() => {
    const id = setTimeout(() => void load(), 0);
    return () => clearTimeout(id);
  }, [load]);

  async function handleToggle(t: EmailTemplateDTO, enabled: boolean) {
    setBusyKey(t.key);
    // Optimistic update.
    setData((prev) => patchTemplate(prev, t.key, { enabled }));
    try {
      const res = await fetch(`/api/admin/email-templates/${t.key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error();
      notifySuccess(
        enabled ? "Template enabled" : "Template disabled",
        `${t.name} emails will ${enabled ? "now" : "no longer"} be sent.`
      );
    } catch {
      setData((prev) => patchTemplate(prev, t.key, { enabled: !enabled }));
      notifyError("Couldn't update template");
    } finally {
      setBusyKey(null);
    }
  }

  // Enable/disable every template in a category at once (parallel PATCH).
  async function bulkSetEnabled(category: Category, enabled: boolean) {
    const list = data[category];
    if (list.length === 0) return;
    setBulkCat(category);
    setData((prev) => ({
      ...prev,
      [category]: prev[category].map((t) => ({ ...t, enabled })),
    }));
    try {
      const results = await Promise.all(
        list.map((t) =>
          fetch(`/api/admin/email-templates/${t.key}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ enabled }),
          }).then((r) => r.ok)
        )
      );
      const ok = results.filter(Boolean).length;
      if (ok > 0)
        notifySuccess(
          `${ok} template${ok === 1 ? "" : "s"} ${enabled ? "enabled" : "disabled"}`
        );
      if (ok < list.length) {
        notifyError("Some updates failed");
        void load();
      }
    } finally {
      setBulkCat(null);
    }
  }

  async function handleTest(t: EmailTemplateDTO) {
    setTestingKey(t.key);
    try {
      const res = await fetch(`/api/admin/email-templates/${t.key}/test`, {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error();
      notifySuccess("Test email sent", json.message);
    } catch {
      notifyError("Couldn't send test email");
    } finally {
      setTestingKey(null);
    }
  }

  async function openPreview(t: EmailTemplateDTO) {
    setPreviewTpl(t);
    setPreviewHtml("");
    setPreviewOpen(true);
    try {
      const res = await fetch(`/api/admin/email-templates/${t.key}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: "{}", // no overrides → preview the saved template
      });
      const json = await res.json();
      if (json?.data?.html) setPreviewHtml(json.data.html);
    } catch {
      notifyError("Couldn't render preview");
    }
  }

  function openEditor(t: EmailTemplateDTO) {
    setEditing(t);
    setEditorKey((k) => k + 1);
    setEditorOpen(true);
  }

  const summary = useMemo(() => {
    const all = [...data.auth, ...data.order, ...data.admin];
    return {
      total: all.length,
      enabled: all.filter((t) => t.enabled).length,
      disabled: all.filter((t) => !t.enabled).length,
    };
  }, [data]);

  const q = search.trim().toLowerCase();
  const visible = (cat: Category) =>
    data[cat].filter(
      (t) =>
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.key.toLowerCase().includes(q)
    );

  return (
    <DashboardShell
      title="Email Templates"
      description="Edit the copy, toggle delivery, and preview every transactional email"
    >
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary chips + search */}
          <div className="flex flex-wrap items-center gap-2">
            <Chip label="Templates" value={summary.total} />
            <Chip label="Enabled" value={summary.enabled} tone="emerald" />
            <Chip label="Disabled" value={summary.disabled} tone="muted" />
            <div className="relative ml-auto w-full max-w-xs">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search templates…"
                aria-label="Search templates"
                className="h-9 pl-8"
              />
            </div>
          </div>

          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as Category)}
            className="w-full"
          >
            <TabsList>
              {TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>
                  {t.label}
                  <Badge variant="secondary" className="ml-1.5 tabular-nums">
                    {data[t.value].length}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>

            {TABS.map((t) => {
              const list = visible(t.value);
              return (
                <TabsContent key={t.value} value={t.value} className="mt-4">
                  {/* Per-category bulk actions */}
                  <div className="mb-3 flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={bulkCat === t.value}
                      onClick={() => bulkSetEnabled(t.value, true)}
                    >
                      <Power className="size-3.5" />
                      Enable all
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={bulkCat === t.value}
                      onClick={() => bulkSetEnabled(t.value, false)}
                    >
                      <PowerOff className="size-3.5" />
                      Disable all
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {list.length === 0 ? (
                      <p className="py-10 text-center text-sm text-muted-foreground">
                        {q
                          ? "No templates match your search."
                          : "No templates in this category."}
                      </p>
                    ) : (
                      list.map((tpl) => (
                        <TemplateCard
                          key={tpl.key}
                          tpl={tpl}
                          stat={stats[tpl.key]}
                          busy={busyKey === tpl.key}
                          testing={testingKey === tpl.key}
                          onToggle={(enabled) => handleToggle(tpl, enabled)}
                          onEdit={() => openEditor(tpl)}
                          onPreview={() => openPreview(tpl)}
                          onTest={() => handleTest(tpl)}
                        />
                      ))
                    )}
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        </div>
      )}

      {/* Editor dialog with live preview (remounts per open) */}
      <EmailTemplateEditor
        key={editorKey}
        template={editing}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        onSaved={load}
      />

      {/* Saved-template preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Preview — {previewTpl?.name ?? "Email"}
            </DialogTitle>
          </DialogHeader>
          <div className="h-[520px] overflow-hidden rounded-lg border bg-muted/30">
            {previewHtml ? (
              <iframe
                title="Email preview"
                sandbox=""
                srcDoc={previewHtml}
                className="h-full w-full border-0 bg-white"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}

// ── Template card ─────────────────────────────────────────────────────────────
function TemplateCard({
  tpl,
  stat,
  busy,
  testing,
  onToggle,
  onEdit,
  onPreview,
  onTest,
}: {
  tpl: EmailTemplateDTO;
  stat?: DeliveryStat;
  busy: boolean;
  testing: boolean;
  onToggle: (enabled: boolean) => void;
  onEdit: () => void;
  onPreview: () => void;
  onTest: () => void;
}) {
  const lastSent = timeAgo(stat?.lastSentAt ?? null);
  return (
    <Card
      size="sm"
      className={cn(
        "flex flex-col gap-3 p-4 transition-opacity sm:flex-row sm:items-center sm:justify-between",
        !tpl.enabled && "opacity-60"
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Mail className="size-4" />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground">{tpl.name}</p>
            {!tpl.enabled && (
              <Badge variant="secondary" className="text-[10px] uppercase">
                Off
              </Badge>
            )}
          </div>
          <p className="truncate text-sm text-muted-foreground">
            {tpl.subject}
          </p>
          {/* Delivery stats */}
          {stat && stat.total > 0 && (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="size-3 text-emerald-500" />
                {stat.sent} sent
              </span>
              {stat.failed > 0 && (
                <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="size-3" />
                  {stat.failed} failed
                </span>
              )}
              {stat.skipped > 0 && <span>{stat.skipped} skipped</span>}
              {lastSent && <span>· last {lastSent}</span>}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <Switch
          checked={tpl.enabled}
          disabled={busy}
          onCheckedChange={(checked) => onToggle(checked)}
          aria-label={tpl.enabled ? "Disable template" : "Enable template"}
        />
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Pencil className="size-3.5" />
          Edit
        </Button>
        <Button variant="ghost" size="sm" onClick={onPreview}>
          <Eye className="size-3.5" />
          Preview
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={testing}
          onClick={onTest}
        >
          {testing ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Send className="size-3.5" />
          )}
          Send test
        </Button>
      </div>
    </Card>
  );
}

function Chip({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "emerald" | "muted";
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-semibold tabular-nums",
          tone === "emerald" && value > 0 && "text-emerald-600 dark:text-emerald-400",
          tone === "muted" && value > 0 && "text-muted-foreground"
        )}
      >
        {value}
      </span>
    </span>
  );
}

// Replace one template across the grouped record (immutable).
function patchTemplate(
  groups: Grouped,
  key: string,
  patch: Partial<EmailTemplateDTO>
): Grouped {
  const next = {} as Grouped;
  for (const cat of Object.keys(groups) as Category[]) {
    next[cat] = groups[cat].map((t) => (t.key === key ? { ...t, ...patch } : t));
  }
  return next;
}
