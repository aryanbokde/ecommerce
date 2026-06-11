"use client";

import { useRef, useState } from "react";
import { Plus, X, Star, GripVertical, ImageUp, Upload, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { notifyError } from "@/lib/notify";

interface ProductImageUploaderProps {
  /** Ordered list of image URLs. The first entry is the primary image. */
  value: string[];
  onChange: (urls: string[]) => void;
}

const ACCEPT = "image/jpeg,image/png,image/webp,image/avif,image/gif";

// Image manager: drag-drop or pick files (uploaded to Cloudinary/local via
// /api/upload), or add by URL. Drag tiles to reorder; the first image is the
// primary one shown on the storefront.
export function ProductImageUploader({
  value,
  onChange,
}: ProductImageUploaderProps) {
  const [url, setUrl] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [fileDragging, setFileDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Upload files to /api/upload in parallel and append the returned URLs
  // (preserving selection order, de-duped against existing + each other).
  async function uploadFiles(files: FileList | File[] | null) {
    const list = files ? Array.from(files) : [];
    if (list.length === 0) return;
    setUploading(true);
    try {
      const results = await Promise.all(
        list.map(async (file) => {
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
            notifyError(`Upload failed: ${file.name}`, json?.error);
            return null;
          }
          return json.data.url as string;
        })
      );
      const seen = new Set(value);
      const added: string[] = [];
      for (const u of results) {
        if (u && !seen.has(u)) {
          seen.add(u);
          added.push(u);
        }
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

  function handleReorderDrop(target: number) {
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

  // Files dragged in from the desktop (no internal reorder in progress).
  function onZoneDrop(e: React.DragEvent) {
    e.preventDefault();
    setFileDragging(false);
    if (dragIndex !== null) return; // internal reorder handled per-tile
    if (e.dataTransfer.files?.length) void uploadFiles(e.dataTransfer.files);
  }

  function onZoneDragOver(e: React.DragEvent) {
    // Only react to file drags from outside, not internal tile reordering.
    if (dragIndex !== null) return;
    if (Array.from(e.dataTransfer.types).includes("Files")) {
      e.preventDefault();
      setFileDragging(true);
    }
  }

  return (
    <div
      className="flex flex-col gap-3"
      onDragOver={onZoneDragOver}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setFileDragging(false);
      }}
      onDrop={onZoneDrop}
    >
      {/* Add by URL + upload */}
      <div className="flex gap-2">
        <Input
          value={url}
          placeholder="https://... image URL"
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
          accept={ACCEPT}
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
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed py-10 text-muted-foreground transition-colors",
            fileDragging
              ? "border-primary bg-primary/5 text-primary"
              : "hover:border-muted-foreground/50 hover:bg-muted/30"
          )}
        >
          <ImageUp className="size-7" />
          <p className="text-sm font-medium">
            Drag &amp; drop images, or click to browse
          </p>
          <p className="text-xs">…or paste an image URL above</p>
        </button>
      ) : (
        <ul
          className={cn(
            "grid grid-cols-3 gap-3 rounded-lg sm:grid-cols-4 md:grid-cols-5",
            fileDragging && "ring-2 ring-primary ring-offset-2"
          )}
        >
          {value.map((src, i) => (
            <li
              key={src}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.stopPropagation();
                handleReorderDrop(i);
              }}
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
                loading="lazy"
                decoding="async"
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
