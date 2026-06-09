"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ImageIcon } from "lucide-react";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { notifySuccess, notifyError } from "@/lib/notify";

const profileSchema = z.object({
  name: z.string().trim().min(1, "Required").max(120),
  phone: z.string().trim().max(20),
  image: z
    .string()
    .trim()
    .max(2048)
    .refine((v) => v === "" || /^https?:\/\/\S+$/.test(v), "Enter a valid URL"),
});

type ProfileValues = z.infer<typeof profileSchema>;

interface MeProfile {
  name: string;
  email: string;
  phone: string | null;
  image: string | null;
}

export function ProfileTab() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: "", phone: "", image: "" },
  });

  // Load the full profile (phone/image aren't on the session).
  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const res = await fetch("/api/users/me", { credentials: "include" });
        if (!res.ok) return;

        const json = await res.json().catch(() => null);
        const me: MeProfile | null = json?.data ?? null;
        if (!cancelled && me) {
          setEmail(me.email);
          form.reset({
            name: me.name ?? "",
            phone: me.phone ?? "",
            image: me.image ?? "",
          });
        }
      } catch {
        // Ignore network failures during smoke renders and initial load.
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [form]);

  const imageUrl = useWatch({ control: form.control, name: "image" });

  async function onSubmit(values: ProfileValues) {
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: values.name,
          phone: values.phone.trim() || null,
          image: values.image.trim() || null,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        notifyError("Couldn't save profile", json?.error);
        return;
      }
      notifySuccess("Profile updated");
    } catch {
      notifyError("Couldn't save profile", "Please try again.");
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <Skeleton className="size-16 rounded-full" />
          <Skeleton className="h-9 flex-1" />
        </div>
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-40" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex max-w-lg flex-col gap-5"
      >
        {/* Avatar URL + live preview */}
        <div className="flex items-center gap-4">
          <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
            {imageUrl && /^https?:\/\//.test(imageUrl) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="" className="size-full object-cover" />
            ) : (
              <ImageIcon className="size-6 text-muted-foreground" />
            )}
          </span>
          <FormField
            control={form.control}
            name="image"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Avatar URL</FormLabel>
                <FormControl>
                  <Input placeholder="https://…/avatar.jpg" {...field} />
                </FormControl>
                <FormDescription>Paste a link to an image.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Your name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Email — read-only */}
        <div className="grid gap-2">
          <Label htmlFor="profile-email">Email</Label>
          <Input id="profile-email" value={email} disabled readOnly />
          <p className="text-xs text-muted-foreground">
            Email can&apos;t be changed here.
          </p>
        </div>

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input type="tel" placeholder="+91 98765 43210" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
            Save changes
          </Button>
        </div>
      </form>
    </Form>
  );
}
