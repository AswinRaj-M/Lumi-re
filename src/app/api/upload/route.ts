import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import { firebaseConfig } from "@/backend/config";
import { checkRateLimit } from "@/server/rateLimiter";
import { verifyAdminRequest, unauthorizedResponse } from "@/server/authGuard";
import {
  validateImageBuffer,
  generateSafeFileName,
  sanitizeText,
  validateId,
  isSafeDirectoryPath,
} from "@/server/fileSecurity";

export interface StoredWork {
  id: string;
  title: string;
  category: "featured" | "gallery";
  imageUrl: string;
  storagePath: string;
  fileSize: number;
  uploadedBy: string;
  createdAt: number;
  storageType: "firebase" | "local";
  displayOrder?: number;
}

function getTmpDeletedPath() {
  return path.join(os.tmpdir(), "lumiere_deleted_works.json");
}

function getTmpWorksPath() {
  return path.join(os.tmpdir(), "lumiere_works.json");
}

function loadDeletedIds(): Set<string> {
  const ids = new Set<string>();
  try {
    const tmpPath = getTmpDeletedPath();
    if (fs.existsSync(tmpPath)) {
      const data = JSON.parse(fs.readFileSync(tmpPath, "utf-8"));
      if (Array.isArray(data)) {
        data.forEach((id: string) => ids.add(id));
      }
    }
  } catch {}
  return ids;
}

function getWorksFilePath() {
  return path.join(process.cwd(), "public", "uploads", "works.json");
}

function readLocalWorks(): StoredWork[] {
  const deleted = loadDeletedIds();
  const tmpPath = getTmpWorksPath();

  let works: StoredWork[] = [];
  try {
    if (fs.existsSync(tmpPath)) {
      const data = fs.readFileSync(tmpPath, "utf-8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        works = parsed;
      }
    }
  } catch (e) {
    console.warn("Could not read from /tmp/works.json:", e);
  }

  if (works.length === 0) {
    try {
      const filePath = getWorksFilePath();
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          works = parsed;
        }
      }
    } catch (e) {
      console.error("Error reading local works.json:", e);
    }
  }

  return works
    .filter((item) => !deleted.has(item.id))
    .map((item) => ({
      ...item,
      category: item.category === "featured" ? "featured" : "gallery",
    }));
}

function saveLocalWork(item: StoredWork) {
  try {
    const list = readLocalWorks();
    const updated = [item, ...list.filter((w) => w.id !== item.id)];
    
    try {
      const filePath = getWorksFilePath();
      fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), "utf-8");
    } catch {
      // Vercel read-only filesystem
    }

    try {
      fs.writeFileSync(getTmpWorksPath(), JSON.stringify(updated, null, 2), "utf-8");
    } catch (e) {
      console.warn("Could not save to /tmp:", e);
    }
  } catch (e) {
    console.error("Error saving to local works.json:", e);
  }
}

function updateLocalWork(id: string, updates: Partial<StoredWork>) {
  try {
    const list = readLocalWorks();
    const updated = list.map((w) => (w.id === id ? { ...w, ...updates } : w));
    
    try {
      const filePath = getWorksFilePath();
      fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), "utf-8");
    } catch {
      // Vercel read-only filesystem
    }

    try {
      fs.writeFileSync(getTmpWorksPath(), JSON.stringify(updated, null, 2), "utf-8");
    } catch (e) {
      console.warn("Could not save to /tmp:", e);
    }

    return updated.find((w) => w.id === id);
  } catch (e) {
    console.error("Error updating local works.json:", e);
  }
  return null;
}

export async function POST(req: NextRequest) {
  // 1. Rate Limiting Protection (Anti-DoS / Anti-Brute-Force)
  const rateLimit = checkRateLimit(req, "upload");
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: "Too many upload requests. Please slow down and try again shortly.",
        retryAfter: rateLimit.resetInSeconds,
      },
      {
        status: 429,
        headers: {
          "Retry-After": rateLimit.resetInSeconds.toString(),
        },
      }
    );
  }

  // 2. Strict Administrator Authorization Guard
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return unauthorizedResponse(authResult);
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const rawTitle = formData.get("title") as string | null;
    const rawCategory = (formData.get("category") as string)?.toLowerCase().trim();
    const rawReplaceId = formData.get("replaceId");

    // 3. File Presence & Validation
    if (!file) {
      return NextResponse.json(
        { error: "No image file provided for upload." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // 4. File Security Inspection (Magic bytes, extension check, malware scan, size limits)
    const fileValidation = validateImageBuffer(buffer, file.name, file.type);
    if (!fileValidation.isValid) {
      return NextResponse.json(
        { error: fileValidation.error || "Invalid file format." },
        { status: fileValidation.status || 400 }
      );
    }

    // 5. Input Sanitization
    const title = sanitizeText(rawTitle || "Untitled Work", 100);
    const category: "featured" | "gallery" =
      rawCategory === "featured" ? "featured" : "gallery";

    const replaceId = rawReplaceId ? validateId(rawReplaceId) : null;
    if (rawReplaceId && !replaceId) {
      return NextResponse.json(
        { error: "Invalid photo identifier format." },
        { status: 400 }
      );
    }

    const currentWorks = readLocalWorks();

    // Check if this is a replacement of an existing photo
    if (replaceId) {
      const existing = currentWorks.find((w) => w.id === replaceId);
      if (!existing) {
        return NextResponse.json(
          { error: "Target photo to replace was not found." },
          { status: 404 }
        );
      }
    } else {
      // Backend enforcement of 5-photo limit for featured gallery
      if (category === "featured") {
        const featuredCount = currentWorks.filter((w) => w.category === "featured").length;
        if (featuredCount >= 5) {
          return NextResponse.json(
            {
              error:
                "Featured photo limit reached (maximum 5). Please replace an existing featured photo or select the Gallery category.",
            },
            { status: 400 }
          );
        }
      }
    }

    // 6. Cryptographically secure filename generation (prevents traversal & collision)
    const safeExt = fileValidation.safeExt || ".jpg";
    const uniqueName = generateSafeFileName(safeExt);
    const uniquePath = `works/${uniqueName}`;
    const encodedPath = encodeURIComponent(uniquePath);
    const bucket =
      firebaseConfig.storageBucket || "photography-aafba.firebasestorage.app";

    let imageUrl = "";
    let storageType: "firebase" | "local" = "firebase";

    // 7. Attempt upload to Firebase Storage REST API
    const authHeader = req.headers.get("authorization");
    try {
      const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?uploadType=media&name=${encodedPath}`;
      const headers: Record<string, string> = {
        "Content-Type": fileValidation.verifiedMime || "image/jpeg",
      };
      if (authHeader) {
        headers["Authorization"] = authHeader;
      }

      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers,
        body: buffer,
      });

      if (uploadResponse.ok) {
        const uploadData = await uploadResponse.json();
        const downloadToken = uploadData.downloadTokens;
        imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media${
          downloadToken ? `&token=${downloadToken}` : ""
        }`;
      } else {
        const errorText = await uploadResponse.text();
        console.warn(
          `Firebase Storage returned status ${uploadResponse.status}. Falling back to local secure storage:`,
          errorText
        );
        storageType = "local";
      }
    } catch (fbErr) {
      console.warn("Firebase Storage fetch error. Falling back to local secure storage:", fbErr);
      storageType = "local";
    }

    // 8. Secure Local Storage with Directory Traversal Containment Check
    if (storageType === "local") {
      const uploadDir = path.join(process.cwd(), "public", "uploads", "works");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const localFilePath = path.join(uploadDir, uniqueName);

      // Verify path cannot escape uploadDir
      if (!isSafeDirectoryPath(uploadDir, localFilePath)) {
        return NextResponse.json(
          { error: "Access denied: Invalid target path." },
          { status: 403 }
        );
      }

      fs.writeFileSync(localFilePath, buffer);
      imageUrl = `/uploads/works/${uniqueName}`;
    }

    // 9. Handle replacement vs new creation
    if (replaceId) {
      const existing = currentWorks.find((w) => w.id === replaceId)!;

      // Clean up old local file if stored locally and within safe directory
      if (existing.storageType === "local" && existing.imageUrl?.startsWith("/uploads/works/")) {
        const uploadDir = path.join(process.cwd(), "public", "uploads", "works");
        const oldFilename = path.basename(existing.imageUrl);
        const oldPath = path.join(uploadDir, oldFilename);

        if (isSafeDirectoryPath(uploadDir, oldPath) && fs.existsSync(oldPath)) {
          try {
            fs.unlinkSync(oldPath);
          } catch (e) {
            console.warn("Could not delete old replaced local file:", e);
          }
        }
      }

      const updated = updateLocalWork(replaceId, {
        imageUrl,
        storagePath: uniquePath,
        fileSize: buffer.length,
        title: title ? title : existing.title,
      });

      return NextResponse.json({
        success: true,
        item: updated,
        storageType,
        replaced: true,
      });
    }

    // 10. Determine display order for featured photos
    let displayOrder: number | undefined = undefined;
    if (category === "featured") {
      const existingFeatured = currentWorks.filter((w) => w.category === "featured");
      displayOrder = existingFeatured.length + 1;
    }

    const workItem: StoredWork = {
      id: `work_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      title,
      category,
      imageUrl,
      storagePath: uniquePath,
      fileSize: buffer.length,
      uploadedBy: authResult.user?.email || "admin",
      createdAt: Date.now(),
      storageType,
      displayOrder,
    };

    saveLocalWork(workItem);

    return NextResponse.json({
      success: true,
      item: workItem,
      storageType,
    });
  } catch (err: unknown) {
    const errorObj = err as { message?: string };
    console.error("API /api/upload exception:", err);
    return NextResponse.json(
      { error: errorObj?.message || "Internal server error during upload." },
      { status: 500 }
    );
  }
}
