"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { notifySuccess, notifyError } from "@/lib/notify";

export interface EmailTemplateDTO {
  id: string;
  key: string;
  category: "auth" | "order" | "admin";
  name: string;
  subject: string;
  heading: string | null;
  introText: string | null;
  ctaLabel: string | null;
  footerNote: string | null;
  enabled: boolean;
}

interface EditForm {
  subject: string;
  heading: string;
  introText: string;
  ctaLabel: string;
  footerNote: string;
}

interface Props {
  template: EmailTemplateDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful save so the parent can refresh its list. */
  onSaved: () => void;
}

const TOKENS_BY_CATEGORY: Record<string, string> = {
  auth: "{name}",
  order: "{orderNumber}",
  admin: "{name}",
};

function toForm(t: EmailTemplateDTO | null): EditForm {
  return {
    subject: t?.subject ?? "",
    heading: t?.heading ?? "",
    introText: t?.introText ?? "",
    ctaLabel: t?.ctaLabel ?? "",
    footerNote: t?.footerNote ?? "",
  };
}

export function EmailTemplateEditor({
  template,
  open,
  onOpenChange,
  onSaved,
}: Props) {
  // Lazy init from the template; the parent remounts this dialog per open (via a
  // changing `key`), so the form always starts from the current saved values.
  const [form, setForm] = useState<EditForm>(() => toForm(template));
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Debounced live preview — re-render as the admin types.
  useEffect(() => {
    if (!open || !template) return;
    const id = setTimeout(async () => {
      setPreviewing(true);
      try {
        const res = await fetch(
          `/api/admin/email-templates/${template.key}/preview`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(form),
          }
        );
        const json = await res.json();
        if (json?.data?.html) setPreviewHtml(json.data.html);
      } catch {
        /* keep the last good preview */
      } finally {
        setPreviewing(false);
      }
    }, 400);
    return () => clearTimeout(id);
  }, [form, open, template]);

  function update<K extends keyof EditForm>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!template || !form.subject.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/email-templates/${template.key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("save failed");
      notifySuccess("Template saved", template.name);
      onSaved();
      onOpenChange(false);
    } catch {
      notifyError("Couldn't save template", "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!template) return null;
  const tokenHint = TOKENS_BY_CATEGORY[template.category] ?? "{name}";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Edit “{template.name}” email</DialogTitle>
          <DialogDescription>
            Changes apply to every {template.category} email of this type.
            Available tokens:{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              {tokenHint}
            </code>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Form */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="tpl-subject">Subject</Label>
              <Input
                id="tpl-subject"
                value={form.subject}
                onChange={(e) => update("subject", e.target.value)}
                placeholder="Email subject line"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tpl-heading">Heading</Label>
              <Input
                id="tpl-heading"
                value={form.heading}
                onChange={(e) => update("heading", e.target.value)}
                placeholder="Big heading inside the email"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tpl-intro">Intro text</Label>
              <Textarea
                id="tpl-intro"
                rows={4}
                value={form.introText}
                onChange={(e) => update("introText", e.target.value)}
                placeholder="The main paragraph of the email"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tpl-cta">Button label</Label>
              <Input
                id="tpl-cta"
                value={form.ctaLabel}
                onChange={(e) => update("ctaLabel", e.target.value)}
                placeholder="e.g. View your order"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tpl-footer">Footer note</Label>
              <Textarea
                id="tpl-footer"
                rows={2}
                value={form.footerNote}
                onChange={(e) => update("footerNote", e.target.value)}
                placeholder="Small print under the content"
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Tip: use{" "}
              <code className="rounded bg-muted px-1 py-0.5">{tokenHint}</code>{" "}
              anywhere — it’s replaced with real values when the email is sent.
            </p>
          </div>

          {/* Live preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Live preview</Label>
              {previewing && (
                <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
              )}
            </div>
            <div className="h-[420px] overflow-hidden rounded-lg border bg-muted/30">
              <iframe
                title="Email preview"
                sandbox=""
                srcDoc={previewHtml}
                className="h-full w-full border-0 bg-white"
              />
            </div>
          </div>
        </div>

        <div className="-mx-4 -mb-4 flex justify-end gap-2 rounded-b-xl border-t bg-muted/50 p-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !form.subject.trim()}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            Save changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
