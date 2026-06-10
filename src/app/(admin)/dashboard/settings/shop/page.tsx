"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { DashboardShell } from "@/components/admin/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ImageUpload } from "@/components/shared/ImageUpload";
import { notifySuccess, notifyError } from "@/lib/notify";

type Group = "general" | "commerce" | "social" | "seo";

interface Field {
  key: string;
  label: string;
  type: "input" | "textarea" | "toggle";
  placeholder?: string;
  hint?: string;
}

const SECTIONS: { group: Group; title: string; fields: Field[] }[] = [
  {
    group: "general",
    title: "General",
    fields: [
      { key: "storeName", label: "Store name", type: "input" },
      { key: "storeLogo", label: "Logo URL", type: "input", placeholder: "https://… (blank = text logo)" },
      { key: "storeAddress", label: "Address", type: "textarea" },
      { key: "storePhone", label: "Phone", type: "input" },
      { key: "supportEmail", label: "Support email", type: "input" },
    ],
  },
  {
    group: "commerce",
    title: "Commerce",
    fields: [
      { key: "currency", label: "Currency", type: "input", hint: "ISO code, e.g. INR" },
      { key: "taxPercent", label: "Tax %", type: "input" },
      { key: "freeShippingThreshold", label: "Free shipping over (₹)", type: "input" },
      { key: "shippingFee", label: "Shipping fee (₹)", type: "input" },
    ],
  },
  {
    group: "commerce",
    title: "Order policy",
    fields: [
      {
        key: "cancellationsEnabled",
        label: "Allow customer cancellations",
        type: "toggle",
        hint: "When off, customers can't cancel — the Cancel button is hidden.",
      },
      {
        key: "returnsEnabled",
        label: "Allow returns",
        type: "toggle",
        hint: "When off, customers can't request returns.",
      },
      {
        key: "returnWindowDays",
        label: "Return window (days)",
        type: "input",
        hint: "Days after delivery a return can be requested.",
      },
    ],
  },
  {
    group: "social",
    title: "Social links",
    fields: [
      { key: "socialFacebook", label: "Facebook URL", type: "input" },
      { key: "socialInstagram", label: "Instagram URL", type: "input" },
      { key: "socialTwitter", label: "Twitter URL", type: "input" },
    ],
  },
  {
    group: "seo",
    title: "SEO",
    fields: [
      { key: "metaTitle", label: "Meta title", type: "input" },
      { key: "metaDescription", label: "Meta description", type: "textarea" },
    ],
  },
];

// key → group, for rebuilding the grouped save payload.
const KEY_GROUP = new Map<string, Group>(
  SECTIONS.flatMap((s) => s.fields.map((f) => [f.key, s.group] as const))
);

// Sensible defaults for keys that may not exist in the DB yet (so toggles show
// the right state on first load before the admin ever saves).
const FIELD_DEFAULTS: Record<string, string> = {
  cancellationsEnabled: "true",
  returnsEnabled: "true",
  returnWindowDays: "7",
};

function emptyForm(): Record<string, string> {
  const f: Record<string, string> = {};
  for (const key of KEY_GROUP.keys()) f[key] = FIELD_DEFAULTS[key] ?? "";
  return f;
}

export default function ShopSettingsPage() {
  const [form, setForm] = useState<Record<string, string>>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings", { credentials: "include" });
      const json = await res.json();
      if (json?.data) {
        const next = emptyForm();
        for (const section of Object.values(json.data) as Record<string, string>[]) {
          for (const [k, v] of Object.entries(section)) {
            if (k in next) next[k] = v;
          }
        }
        setForm(next);
      }
    } catch {
      notifyError("Couldn't load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => void load(), 0);
    return () => clearTimeout(id);
  }, [load]);

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    // Rebuild the grouped payload from the flat form.
    const body: Record<Group, Record<string, string>> = {
      general: {},
      commerce: {},
      social: {},
      seo: {},
    };
    for (const [key, value] of Object.entries(form)) {
      const group = KEY_GROUP.get(key);
      if (group) body[group][key] = value;
    }

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      notifySuccess("Settings saved", "Your store configuration is updated.");
    } catch {
      notifyError("Couldn't save settings", "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell
      title="Store Settings"
      description="Branding, commerce, social, and SEO — used across the storefront and emails"
      action={
        <Button onClick={handleSave} disabled={saving || loading}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save changes
        </Button>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {SECTIONS.map((section) => (
            <Card key={section.group} size="sm">
              <CardHeader>
                <CardTitle className="text-base">{section.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {section.fields.map((f) =>
                  f.key === "storeLogo" ? (
                    <div key={f.key} className="space-y-1.5">
                      <Label>{f.label}</Label>
                      <ImageUpload
                        value={form[f.key] || null}
                        onChange={(url) => update(f.key, url ?? "")}
                        folder="store"
                        shape="square"
                      />
                      <Input
                        className="mt-1"
                        value={form[f.key] ?? ""}
                        placeholder="…or paste a logo URL (blank = text logo)"
                        onChange={(e) => update(f.key, e.target.value)}
                      />
                    </div>
                  ) : f.type === "toggle" ? (
                    <div key={f.key} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <Label htmlFor={`set-${f.key}`}>{f.label}</Label>
                        <Switch
                          id={`set-${f.key}`}
                          checked={(form[f.key] ?? "true") === "true"}
                          onCheckedChange={(v) =>
                            update(f.key, v ? "true" : "false")
                          }
                        />
                      </div>
                      {f.hint && (
                        <p className="text-xs text-muted-foreground">{f.hint}</p>
                      )}
                    </div>
                  ) : (
                    <div key={f.key} className="space-y-1.5">
                      <Label htmlFor={`set-${f.key}`}>{f.label}</Label>
                      {f.type === "textarea" ? (
                        <Textarea
                          id={`set-${f.key}`}
                          rows={2}
                          value={form[f.key] ?? ""}
                          placeholder={f.placeholder}
                          onChange={(e) => update(f.key, e.target.value)}
                        />
                      ) : (
                        <Input
                          id={`set-${f.key}`}
                          value={form[f.key] ?? ""}
                          placeholder={f.placeholder}
                          onChange={(e) => update(f.key, e.target.value)}
                        />
                      )}
                      {f.hint && (
                        <p className="text-xs text-muted-foreground">{f.hint}</p>
                      )}
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
