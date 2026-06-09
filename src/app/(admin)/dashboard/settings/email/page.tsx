"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Eye, Send, Loader2, Mail } from "lucide-react";
import { DashboardShell } from "@/components/admin/DashboardShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

const TABS: { value: Category; label: string }[] = [
  { value: "auth", label: "Auth" },
  { value: "order", label: "Order" },
  { value: "admin", label: "Admin" },
];

export default function EmailTemplatesPage() {
  const [data, setData] = useState<Grouped>({ auth: [], order: [], admin: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Category>("auth");

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

          {TABS.map((t) => (
            <TabsContent key={t.value} value={t.value} className="mt-4">
              <div className="space-y-3">
                {data[t.value].map((tpl) => (
                  <TemplateCard
                    key={tpl.key}
                    tpl={tpl}
                    busy={busyKey === tpl.key}
                    testing={testingKey === tpl.key}
                    onToggle={(enabled) => handleToggle(tpl, enabled)}
                    onEdit={() => openEditor(tpl)}
                    onPreview={() => openPreview(tpl)}
                    onTest={() => handleTest(tpl)}
                  />
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
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
  busy,
  testing,
  onToggle,
  onEdit,
  onPreview,
  onTest,
}: {
  tpl: EmailTemplateDTO;
  busy: boolean;
  testing: boolean;
  onToggle: (enabled: boolean) => void;
  onEdit: () => void;
  onPreview: () => void;
  onTest: () => void;
}) {
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
