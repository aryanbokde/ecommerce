"use client";

import { useRef, useState } from "react";
import { Plus, X, Star, GripVertical, ImageOff, Upload, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { notifyError } from "@/lib/notify";

interface ProductImageUploaderProps {
  /** Ordered list of image URLs. The first entry is the primary image. */
  value: string[];
  onChange: (urls: string[]) => void;
}

// URL-based image manager: add by URL, drag to reorder, remove, and the first
// image is the primary. (No binary upload endpoint exists yet — when one is
// added, wire an "Upload" button here that pushes the returned URL.)
export function ProductImageUploader({
  value,
  onChange,
}: ProductImageUploaderProps) {
  const [url, setUrl] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Upload one or more files to Cloudinary/local via /api/upload and append the
  // returned URLs (preserving order, de-duped against existing).
  async function uploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    const added: string[] = [];
    try {
      for (const file of Array.from(files)) {
        const body = new FormData();
        body.set("file", file);
        body.set("folder", "products");
        const res = await fetch("/api/upload", {
          method: "POST",
          credentials: "include",
          body,
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          notifyError("Upload failed", json?.error);
          continue;
        }
        const u = json.data.url as string;
        if (!value.includes(u) && !added.includes(u)) added.push(u);
      }
      if (added.length) onChange([...value, ...added]);
    } finally {
      setUploading(false);
    }
  }

  function addUrl() {
    const u = url.trim();
    if (!u) return;
    if (value.includes(u)) {
      setUrl("");
      return;
    }
    onChange([...value, u]);
    setUrl("");
  }

  function remove(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }

  function makePrimary(i: number) {
    if (i === 0) return;
    const next = [...value];
    const [item] = next.splice(i, 1);
    next.unshift(item);
    onChange(next);
  }

  function handleDrop(target: number) {
    if (dragIndex === null || dragIndex === target) {
      setDragIndex(null);
      return;
    }
    const next = [...value];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(target, 0, moved);
    onChange(next);
    setDragIndex(null);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Add by URL */}
      <div className="flex gap-2">
        <Input
          value={url}
          placeholder="https://… image URL"
          inputMode="url"
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addUrl();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={addUrl}>
          <Plus className="size-4" />
          Add
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
          className="hidden"
          onChange={(e) => {
            void uploadFiles(e.target.files);
            e.target.value = ""; // allow re-selecting the same file(s)
          }}
        />
        <Button
          type="button"
          variant="outline"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}
          Upload
        </Button>
      </div>

      {value.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed py-8 text-muted-foreground">
          <ImageOff className="size-6" />
          <p className="text-sm">No images yet. Paste a URL above.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {value.map((src, i) => (
            <li
              key={src}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(i)}
              onDragEnd={() => setDragIndex(null)}
              className={cn(
                "group relative aspect-square overflow-hidden rounded-lg border bg-muted",
                dragIndex === i && "opacity-50 ring-2 ring-ring"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`Product image ${i + 1}`}
                className="size-full object-cover"
              />

              {/* Primary badge */}
              {i === 0 && (
                <span className="absolute left-1 top-1 inline-flex items-center gap-0.5 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                  <Star className="size-2.5 fill-current" />
                  Primary
                </span>
              )}

              {/* Drag handle hint */}
              <span className="absolute right-1 top-1 cursor-grab rounded bg-background/80 p-0.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                <GripVertical className="size-3.5" />
              </span>

              {/* Controls */}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent p-1 opacity-0 transition-opacity group-hover:opacity-100">
                {i !== 0 ? (
                  <button
                    type="button"
                    onClick={() => makePrimary(i)}
                    className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-black hover:bg-white"
                  >
                    Make primary
                  </button>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  aria-label="Remove image"
                  onClick={() => remove(i)}
                  className="rounded bg-white/90 p-1 text-destructive hover:bg-white"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
