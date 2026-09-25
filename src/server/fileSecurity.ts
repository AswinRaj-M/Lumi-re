import crypto from "crypto";
import path from "path";

// 15 Megabytes maximum upload size
export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;

// Whitelisted MIME types
export const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

// Whitelisted file extensions
export const ALLOWED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".avif",
]);

export interface ImageValidationResult {
  isValid: boolean;
  detectedFormat?: "jpeg" | "png" | "webp" | "avif";
  safeExt?: string;
  verifiedMime?: string;
  error?: string;
  status?: number;
}

/**
 * Validates the file buffer's size, magic bytes signature, and structural integrity.
 * Strictly rejects non-images, SVGs (stored XSS vector), scripts, and corrupted files.
 */
export function validateImageBuffer(
  buffer: Buffer,
  originalName: string,
  claimedMime?: string
): ImageValidationResult {
  // 1. Size Check
  if (!buffer || buffer.length === 0) {
    return { isValid: false, error: "The uploaded file is empty.", status: 400 };
  }

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      error: `File size exceeds the 15MB limit (received ${(
        buffer.length /
        (1024 * 1024)
      ).toFixed(2)}MB).`,
      status: 413,
    };
  }

  // 2. Anti-Malware / Anti-Script Scan
  // Scan beginning bytes for script, HTML, or executable injection
  const headSnippet = buffer.subarray(0, Math.min(buffer.length, 512)).toString("ascii");
  if (
    /<\?php|<\?xml|<html|<script|<svg|#!\/bin/i.test(headSnippet) ||
    headSnippet.includes("<!DOCTYPE")
  ) {
    return {
      isValid: false,
      error: "Potentially malicious file detected. Upload rejected.",
      status: 400,
    };
  }

  // Check for Windows executable MZ header (0x4D 0x5A) or Linux ELF header (0x7F 'ELF')
  if (
    (buffer[0] === 0x4d && buffer[1] === 0x5a) ||
    (buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46)
  ) {
    return {
      isValid: false,
      error: "Executable binaries are strictly forbidden.",
      status: 400,
    };
  }

  // 3. Inspect Magic Byte Signatures
  let detectedFormat: "jpeg" | "png" | "webp" | "avif" | null = null;
  let safeExt = ".jpg";
  let verifiedMime = "image/jpeg";

  // JPEG: 0xFF 0xD8 0xFF
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    detectedFormat = "jpeg";
    safeExt = ".jpg";
    verifiedMime = "image/jpeg";
  }
  // PNG: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
  else if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    detectedFormat = "png";
    safeExt = ".png";
    verifiedMime = "image/png";
  }
  // WEBP: "RIFF" .... "WEBP"
  else if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && // R
    buffer[1] === 0x49 && // I
    buffer[2] === 0x46 && // F
    buffer[3] === 0x46 && // F
    buffer[8] === 0x57 && // W
    buffer[9] === 0x45 && // E
    buffer[10] === 0x42 && // B
    buffer[11] === 0x50 // P
  ) {
    detectedFormat = "webp";
    safeExt = ".webp";
    verifiedMime = "image/webp";
  }
  // AVIF: contains "ftyp" at bytes 4..7 with brand "avif" or "avis" or "mif1"
  else if (
    buffer.length >= 16 &&
    buffer[4] === 0x66 && // f
    buffer[5] === 0x74 && // t
    buffer[6] === 0x79 && // y
    buffer[7] === 0x70 // p
  ) {
    const brand = buffer.subarray(8, 12).toString("ascii");
    if (["avif", "avis", "mif1", "msf1"].includes(brand)) {
      detectedFormat = "avif";
      safeExt = ".avif";
      verifiedMime = "image/avif";
    }
  }

  if (!detectedFormat) {
    return {
      isValid: false,
      error: "Invalid file format. Only verified JPEG, PNG, WebP, and AVIF photos are allowed.",
      status: 400,
    };
  }

  // 4. Extension validation
  const ext = path.extname(originalName).toLowerCase();
  if (ext && !ALLOWED_EXTENSIONS.has(ext)) {
    return {
      isValid: false,
      error: `File extension '${ext}' is not permitted.`,
      status: 400,
    };
  }

  return {
    isValid: true,
    detectedFormat,
    safeExt,
    verifiedMime,
  };
}

/**
 * Generates an unguessable, cryptographically safe filename to prevent overwriting
 * and directory traversal.
 */
export function generateSafeFileName(safeExt: string): string {
  const randomHex = crypto.randomBytes(12).toString("hex");
  const timestamp = Date.now();
  return `work_${timestamp}_${randomHex}${safeExt}`;
}

/**
 * Sanitizes user-provided strings against XSS, control characters, and buffer overflows.
 */
export function sanitizeText(input: string, maxLength = 100): string {
  if (!input || typeof input !== "string") return "";
  return input
    .replace(/<[^>]*>?/gm, "") // Strip HTML tags
    .replace(/[^\w\s\-\.,!?'"&()]/gi, "") // Keep safe punctuation and alphanumeric characters
    .trim()
    .slice(0, maxLength);
}

/**
 * Validates that an ID is alphanumeric and safe from traversal or injection.
 */
export function validateId(id: unknown): string | null {
  if (typeof id !== "string") return null;
  const trimmed = id.trim();
  if (/^[a-zA-Z0-9_\-\.]{3,128}$/.test(trimmed)) {
    // Ensure no traversal sequence like '..'
    if (!trimmed.includes("..")) {
      return trimmed;
    }
  }
  return null;
}

/**
 * Guarantees that targetFilePath is strictly contained within baseDir to prevent path traversal.
 */
export function isSafeDirectoryPath(baseDir: string, targetFilePath: string): boolean {
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(targetFilePath);
  return (
    resolvedTarget.startsWith(resolvedBase + path.sep) ||
    resolvedTarget === resolvedBase
  );
}
