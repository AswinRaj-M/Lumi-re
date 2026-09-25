import fs from "fs";
import path from "path";
import { type WorkItem } from "./imageService";

export function getLocalWorksServer(category?: "featured" | "gallery"): WorkItem[] {
  try {
    const filePath = path.join(process.cwd(), "public", "uploads", "works.json");
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        const works: WorkItem[] = parsed.map((item) => ({
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
    }
  } catch (e) {
    console.error("Error reading works.json on server:", e);
  }
  return [];
}
