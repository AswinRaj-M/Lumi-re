import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { checkRateLimit } from "@/server/rateLimiter";
import { verifyAdminRequest, unauthorizedResponse } from "@/server/authGuard";
import { validateId, sanitizeText, isSafeDirectoryPath } from "@/server/fileSecurity";

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

function getWorksFilePath() {
  return path.join(process.cwd(), "public", "uploads", "works.json");
}

function readLocalWorks(): StoredWork[] {
  try {
    const filePath = getWorksFilePath();
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => ({
          ...item,
          category: item.category === "featured" ? "featured" : "gallery",
        }));
      }
    }
  } catch (e) {
    console.error("Error reading works.json:", e);
  }
  return [];
}

function writeLocalWorks(works: StoredWork[]) {
  try {
    const filePath = getWorksFilePath();
    fs.writeFileSync(filePath, JSON.stringify(works, null, 2), "utf-8");
  } catch (e) {
    console.error("Error writing to works.json:", e);
  }
}

// Ensure contiguous 1-indexed displayOrder for all featured photos
function resequenceFeatured(works: StoredWork[]): StoredWork[] {
  const featured = works.filter((w) => w.category === "featured");
  featured.sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));

  const orderMap = new Map<string, number>();
  featured.forEach((item, index) => {
    orderMap.set(item.id, index + 1);
  });

  return works.map((w) => {
    if (w.category === "featured") {
      return { ...w, displayOrder: orderMap.get(w.id) ?? 1 };
    }
    const { displayOrder, ...rest } = w;
    return rest as StoredWork;
  });
}

/**
 * GET /api/works
 * Public read access for portfolio and gallery displays, protected by rate limiting.
 */
export async function GET(req: NextRequest) {
  // Rate limit check
  const rateLimit = checkRateLimit(req, "read");
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": rateLimit.resetInSeconds.toString() } }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    const works = readLocalWorks();

    if (category === "featured") {
      const featured = works
        .filter((w) => w.category === "featured")
        .sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99))
        .slice(0, 5);
      return NextResponse.json({ success: true, works: featured });
    }

    if (category === "gallery") {
      const gallery = works
        .filter((w) => w.category === "gallery")
        .sort((a, b) => b.createdAt - a.createdAt);
      return NextResponse.json({ success: true, works: gallery });
    }

    // Default: Return all works, with featured first sorted by displayOrder, then gallery
    const featured = works
      .filter((w) => w.category === "featured")
      .sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));
    const gallery = works
      .filter((w) => w.category === "gallery")
      .sort((a, b) => b.createdAt - a.createdAt);

    return NextResponse.json({
      success: true,
      works: [...featured, ...gallery],
    });
  } catch (err: unknown) {
    const errorObj = err as { message?: string };
    return NextResponse.json(
      { error: errorObj?.message || "Failed to retrieve works" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/works?id=...
 * Strictly restricted to verified administrators.
 */
export async function DELETE(req: NextRequest) {
  // 1. Rate limiting
  const rateLimit = checkRateLimit(req, "mutate");
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many modification requests. Please wait." },
      { status: 429, headers: { "Retry-After": rateLimit.resetInSeconds.toString() } }
    );
  }

  // 2. Administrator Authorization Guard
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return unauthorizedResponse(authResult);
  }

  try {
    const { searchParams } = new URL(req.url);
    const rawId = searchParams.get("id");
    const id = validateId(rawId);

    if (!id) {
      return NextResponse.json({ error: "A valid Work ID is required" }, { status: 400 });
    }

    const works = readLocalWorks();
    const itemToDelete = works.find((w) => w.id === id);

    if (itemToDelete) {
      // If local file, securely delete within directory boundary
      if (itemToDelete.storageType === "local" && itemToDelete.imageUrl?.startsWith("/uploads/works/")) {
        const uploadDir = path.join(process.cwd(), "public", "uploads", "works");
        const filename = path.basename(itemToDelete.imageUrl);
        const localPath = path.join(uploadDir, filename);

        if (isSafeDirectoryPath(uploadDir, localPath) && fs.existsSync(localPath)) {
          try {
            fs.unlinkSync(localPath);
          } catch (e) {
            console.warn("Could not delete local file safely:", e);
          }
        }
      }

      let remaining = works.filter((w) => w.id !== id);

      // If a featured photo was removed, re-sequence the remaining featured photos
      if (itemToDelete.category === "featured") {
        remaining = resequenceFeatured(remaining);
      }

      writeLocalWorks(remaining);
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const errorObj = err as { message?: string };
    return NextResponse.json(
      { error: errorObj?.message || "Failed to delete item" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/works
 * Strictly restricted to verified administrators.
 */
export async function PATCH(req: NextRequest) {
  // 1. Rate limiting
  const rateLimit = checkRateLimit(req, "mutate");
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many modification requests. Please wait." },
      { status: 429, headers: { "Retry-After": rateLimit.resetInSeconds.toString() } }
    );
  }

  // 2. Administrator Authorization Guard
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return unauthorizedResponse(authResult);
  }

  try {
    const body = await req.json();
    const { action } = body;
    let works = readLocalWorks();

    // ACTION 1: Change photo category between "featured" and "gallery"
    if (action === "change_category") {
      const id = validateId(body.id);
      const category = body.category;

      if (!id || (category !== "featured" && category !== "gallery")) {
        return NextResponse.json(
          { error: "Invalid parameters. Valid id and category ('featured' | 'gallery') are required." },
          { status: 400 }
        );
      }

      const item = works.find((w) => w.id === id);
      if (!item) {
        return NextResponse.json({ error: "Photo not found." }, { status: 404 });
      }

      if (item.category === category) {
        return NextResponse.json({ success: true, item, works });
      }

      if (category === "featured") {
        const currentFeatured = works.filter((w) => w.category === "featured");
        // Strict enforcement: Max 5 featured photos
        if (currentFeatured.length >= 5) {
          return NextResponse.json(
            {
              error:
                "Cannot move this photo to Featured. Featured Photos already contains 5 photos. Remove or move an existing Featured Photo first.",
            },
            { status: 400 }
          );
        }

        // Assign next available displayOrder
        const newOrder = currentFeatured.length + 1;
        works = works.map((w) =>
          w.id === id ? { ...w, category: "featured", displayOrder: newOrder } : w
        );
      } else {
        // Moving from Featured to Gallery
        works = works.map((w) => {
          if (w.id === id) {
            const { displayOrder, ...rest } = w;
            return { ...rest, category: "gallery" as const };
          }
          return w;
        });

        // Re-sequence remaining featured photos
        works = resequenceFeatured(works);
      }

      writeLocalWorks(works);
      const updatedItem = works.find((w) => w.id === id);
      return NextResponse.json({ success: true, item: updatedItem, works });
    }

    // ACTION 2: Reorder featured photos
    if (action === "reorder_featured") {
      const { orderedIds } = body;
      if (!Array.isArray(orderedIds) || orderedIds.length > 50) {
        return NextResponse.json(
          { error: "orderedIds must be a valid array of photo IDs (max 50)." },
          { status: 400 }
        );
      }

      // Validate all IDs
      const sanitizedIds: string[] = [];
      for (const rawId of orderedIds) {
        const valid = validateId(rawId);
        if (!valid) {
          return NextResponse.json({ error: "Invalid photo ID format in order list." }, { status: 400 });
        }
        sanitizedIds.push(valid);
      }

      const orderMap = new Map<string, number>();
      sanitizedIds.forEach((id: string, index: number) => {
        orderMap.set(id, index + 1);
      });

      works = works.map((w) => {
        if (w.category === "featured" && orderMap.has(w.id)) {
          return { ...w, displayOrder: orderMap.get(w.id)! };
        }
        return w;
      });

      works = resequenceFeatured(works);
      writeLocalWorks(works);
      return NextResponse.json({ success: true, works });
    }

    // ACTION 3: Update title
    if (action === "update_title") {
      const id = validateId(body.id);
      const rawTitle = body.title;

      if (!id || typeof rawTitle !== "string") {
        return NextResponse.json(
          { error: "Valid id and title are required." },
          { status: 400 }
        );
      }

      const sanitized = sanitizeText(rawTitle, 100);
      works = works.map((w) => (w.id === id ? { ...w, title: sanitized } : w));
      writeLocalWorks(works);
      const updatedItem = works.find((w) => w.id === id);
      return NextResponse.json({ success: true, item: updatedItem });
    }

    return NextResponse.json({ error: "Unknown action specified." }, { status: 400 });
  } catch (err: unknown) {
    const errorObj = err as { message?: string };
    console.error("API /api/works PATCH exception:", err);
    return NextResponse.json(
      { error: errorObj?.message || "Internal server error during update." },
      { status: 500 }
    );
  }
}
