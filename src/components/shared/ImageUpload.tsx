"use client";

import { useRef, useState } from "react";
import { Loader2, Upload, X, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { notifyError } from "@/lib/notify";

type Folder = "products" | "avatars" | "store" | "categories";

/**
 * Single-image upload with preview. Posts to /api/upload and hands the returned
 * URL back via onChange. Used for avatars (circle) and the store logo (square).
 */
export function ImageUpload({
  value,
  onChange,
  folder,
  shape = "square",
  className,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  folder: Folder;
  shape?: "circle" | "square";
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  async function upload(file: File) {
    setBusy(true);
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("folder", folder);
      const res = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
        body,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        notifyError("Upload failed", json?.error);
        return;
      }
      // Guard: only ever hand a string URL back. A non-string (e.g. an object
      // from an unexpected response) would render as "[object Object]".
      const url = json?.data?.url;
      if (typeof url !== "string" || url === "") {
        notifyError("Upload failed", "Unexpected response from the server.");
        return;
      }
      onChange(url);
    } catch {
      notifyError("Upload failed", "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function pick(files: FileList | null) {
    const file = files?.[0];
    if (file) void upload(file);
  }

  const rounded = shape === "circle" ? "rounded-full" : "rounded-lg";

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <span
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          pick(e.dataTransfer.files);
        }}
        className={cn(
          "relative flex size-20 shrink-0 items-center justify-center overflow-hidden border border-border bg-muted",
          rounded,
          dragOver && "ring-2 ring-ring"
        )}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="size-full object-cover" />
        ) : (
          <ImageIcon className="size-6 text-muted-foreground" />
        )}
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center bg-background/60">
            <Loader2 className="size-5 animate-spin" />
          </span>
        )}
      </span>

      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
          className="hidden"
          onChange={(e) => {
            pick(e.target.files);
            e.target.value = ""; // allow re-selecting the same file
          }}
        />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="size-4" />
            {value ? "Replace" : "Upload"}
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => onChange(null)}
            >
              <X className="size-4" />
              Remove
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          JPEG, PNG, WebP, AVIF or GIF · max 5 MB. Or drag &amp; drop.
        </p>
      </div>
    </div>
  );
}
