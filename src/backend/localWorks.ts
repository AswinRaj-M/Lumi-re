import fs from "fs";
import path from "path";
import os from "os";
import { type WorkItem } from "./imageService";

function loadServerDeletedIds(): Set<string> {
  const ids = new Set<string>();
  try {
    const tmpPath = path.join(os.tmpdir(), "lumiere_deleted_works.json");
    if (fs.existsSync(tmpPath)) {
      const data = JSON.parse(fs.readFileSync(tmpPath, "utf-8"));
      if (Array.isArray(data)) {
        data.forEach((id: string) => ids.add(id));
      }
    }
  } catch {}
  return ids;
}

export function getLocalWorksServer(category?: "featured" | "gallery"): WorkItem[] {
  try {
    const deletedIds = loadServerDeletedIds();
    const tmpPath = path.join(os.tmpdir(), "lumiere_works.json");
    let parsed: any[] = [];

    if (fs.existsSync(tmpPath)) {
      try {
        const tmpData = JSON.parse(fs.readFileSync(tmpPath, "utf-8"));
        if (Array.isArray(tmpData) && tmpData.length > 0) {
          parsed = tmpData;
        }
      } catch {}
    }

    if (parsed.length === 0) {
      const filePath = path.join(process.cwd(), "public", "uploads", "works.json");
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, "utf-8");
        parsed = JSON.parse(data);
      }
    }

    if (Array.isArray(parsed)) {
      const works: WorkItem[] = parsed
        .filter((item) => !deletedIds.has(item.id))
        .map((item) => ({
          ...item,
          category: item.category === "featured" ? "featured" : "gallery",
        }));

      if (category === "featured") {
        return works
          .filter((w) => w.category === "featured")
          .sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99))
          .slice(0, 5);
      }

      if (category === "gallery") {
        return works
          .filter((w) => w.category === "gallery")
          .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
      }

      return works;
    }
  } catch (e) {
    console.error("Error reading works on server:", e);
  }
  return [];
}
