import { type NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/with-error-handler";
import { requireUser, STAFF_ROLES } from "@/lib/api-auth";
import { AppError, ErrorCode } from "@/lib/api-error";
import {
  uploadImage,
  assertValidImage,
  type UploadFolder,
} from "@/lib/storage";

// Cloudinary SDK + fs need the Node.js runtime (not Edge).
export const runtime = "nodejs";

const FOLDERS: UploadFolder[] = ["products", "avatars", "store", "categories"];

// POST /api/upload — multipart form: { file, folder }. Returns { url }.
//  - avatars: any signed-in user (their own picture).
//  - products / store: staff only (admin · shop_manager).
export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await requireUser();

  const form = await req.formData().catch(() => null);
  if (!form) {
    throw new AppError(
      "Expected multipart/form-data",
      ErrorCode.VALIDATION_ERROR,
      422
    );
  }

  const folder = String(form.get("folder") ?? "") as UploadFolder;
  if (!FOLDERS.includes(folder)) {
    throw new AppError(
      `folder must be one of: ${FOLDERS.join(", ")}`,
      ErrorCode.VALIDATION_ERROR,
      422
    );
  }

  // Catalog + store assets are staff-managed; avatars are self-service.
  if (folder !== "avatars" && !STAFF_ROLES.includes(session.user.role)) {
    throw new AppError(
      "You do not have permission to upload here",
      ErrorCode.FORBIDDEN,
      403
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    throw new AppError("No file provided", ErrorCode.VALIDATION_ERROR, 422);
  }

  assertValidImage(file.type, file.size);

  const buffer = Buffer.from(await file.arrayBuffer());
  const { url } = await uploadImage(buffer, { folder, mime: file.type });

  return NextResponse.json({
    success: true,
    message: "Image uploaded",
    data: { url },
  });
});
