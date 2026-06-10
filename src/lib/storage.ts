import "server-only";

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { v2 as cloudinary } from "cloudinary";
import { nanoid } from "nanoid";
import { AppError, ErrorCode } from "@/lib/api-error";

// ── Pluggable image storage ───────────────────────────────────────────────────
// One interface, two adapters. Provider chosen by STORAGE_PROVIDER, else inferred:
// Cloudinary when its credentials are present, otherwise the local filesystem
// (public/uploads/…) — zero-config for local dev (XAMPP). Swapping to Cloudinary
// later is just dropping the three env vars in; no product code changes.

export type UploadFolder = "products" | "avatars" | "store" | "categories";

export interface UploadResult {
  url: string;
}

// Accepted image types + their canonical extension (for the local adapter).
const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

export const ACCEPTED_IMAGE_TYPES = Object.keys(MIME_EXT);
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

const hasCloudinary =
  !!process.env.CLOUDINARY_CLOUD_NAME &&
  !!process.env.CLOUDINARY_API_KEY &&
  !!process.env.CLOUDINARY_API_SECRET;

const PROVIDER =
  process.env.STORAGE_PROVIDER || (hasCloudinary ? "cloudinary" : "local");

if (hasCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

/** The active storage backend ("cloudinary" | "local"). */
export function storageProvider(): string {
  return PROVIDER;
}

/** Validate an upload's type + size. Throws AppError(422) on a bad file. */
export function assertValidImage(mime: string, size: number): void {
  if (!MIME_EXT[mime]) {
    throw new AppError(
      "Unsupported image type. Use JPEG, PNG, WebP, AVIF, or GIF.",
      ErrorCode.VALIDATION_ERROR,
      422
    );
  }
  if (size > MAX_IMAGE_BYTES) {
    throw new AppError(
      "Image is too large (max 5 MB).",
      ErrorCode.VALIDATION_ERROR,
      422
    );
  }
}

/**
 * Persist an image and return its public URL. Caller is responsible for auth
 * and for validating the file first (assertValidImage).
 */
export async function uploadImage(
  buffer: Buffer,
  opts: { folder: UploadFolder; mime: string }
): Promise<UploadResult> {
  if (PROVIDER === "cloudinary") {
    if (!hasCloudinary) {
      throw new AppError(
        "Image storage is not configured (Cloudinary credentials missing).",
        ErrorCode.SERVER_ERROR,
        500
      );
    }
    const dataUri = `data:${opts.mime};base64,${buffer.toString("base64")}`;
    const res = await cloudinary.uploader.upload(dataUri, {
      folder: `myshop/${opts.folder}`,
      resource_type: "image",
    });
    return { url: res.secure_url };
  }

  // Local filesystem → public/uploads/<folder>/<random>.<ext>, served at /uploads/…
  const ext = MIME_EXT[opts.mime] ?? "bin";
  const filename = `${nanoid(16)}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", opts.folder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);
  return { url: `/uploads/${opts.folder}/${filename}` };
}
