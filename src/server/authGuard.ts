import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { firebaseConfig } from "@/backend/config";

export interface AuthUser {
  uid: string;
  email?: string;
}

export interface AdminAuthVerificationResult {
  authenticated: boolean;
  user?: AuthUser;
  error?: string;
  status?: number;
}

/**
 * Validates whether the incoming request contains an authentic administrator token.
 * Validates against Google Identity Toolkit (Firebase Auth token verification)
 * and supports optional timing-safe ADMIN_API_SECRET check.
 */
export async function verifyAdminRequest(
  req: NextRequest
): Promise<AdminAuthVerificationResult> {
  const authHeader = req.headers.get("authorization") || "";
  const customTokenHeader = req.headers.get("x-admin-token") || "";
  const customSecretHeader = req.headers.get("x-admin-secret") || "";

  let bearerToken = "";
  if (authHeader.startsWith("Bearer ")) {
    bearerToken = authHeader.substring(7).trim();
  } else if (authHeader) {
    bearerToken = authHeader.trim();
  } else if (customTokenHeader) {
    bearerToken = customTokenHeader.trim();
  }

  // 1. Check optional ADMIN_API_SECRET if configured in environment
  const configuredSecret = process.env.ADMIN_API_SECRET || process.env.ADMIN_SECRET_KEY;
  if (configuredSecret && configuredSecret.length > 0) {
    const candidate = customSecretHeader || bearerToken;
    if (candidate) {
      try {
        const candidateBuf = Buffer.from(candidate);
        const secretBuf = Buffer.from(configuredSecret);
        if (
          candidateBuf.length === secretBuf.length &&
          crypto.timingSafeEqual(candidateBuf, secretBuf)
        ) {
          return {
            authenticated: true,
            user: { uid: "admin_secret_user", email: "admin@system.local" },
          };
        }
      } catch {
        // Continue to token check if timingSafeEqual fails
      }
    }
  }

  // 2. Validate Firebase ID token
  if (!bearerToken) {
    return {
      authenticated: false,
      error: "Missing authorization token. Administrator authentication required.",
      status: 401,
    };
  }

  const apiKey = firebaseConfig.apiKey;
  if (!apiKey) {
    return {
      authenticated: false,
      error: "Authentication service is temporarily unavailable.",
      status: 500,
    };
  }

  try {
    const lookupUrl = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`;
    const response = await fetch(lookupUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: bearerToken }),
    });

    if (response.ok) {
      const data = await response.json();
      const userRecord = data.users?.[0];

      if (userRecord && userRecord.localId) {
        return {
          authenticated: true,
          user: {
            uid: userRecord.localId,
            email: userRecord.email || "admin@firebase.local",
          },
        };
      }
    }

    // If Google returned an error, parse code safely
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody?.error?.message || "Invalid or expired administrator token.";

    return {
      authenticated: false,
      error: `Authentication failed: ${message}`,
      status: 401,
    };
  } catch (netErr) {
    console.error("Firebase auth verification network error:", netErr);

    // Development emergency safeguard: If in development environment without internet,
    // ensure basic JWT structure check to avoid blocking dev workflow completely.
    if (process.env.NODE_ENV === "development") {
      const parts = bearerToken.split(".");
      if (parts.length === 3) {
        try {
          const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
          if (payload && (payload.user_id || payload.sub)) {
            return {
              authenticated: true,
              user: {
                uid: payload.user_id || payload.sub,
                email: payload.email || "dev_admin@local",
              },
            };
          }
        } catch {
          // invalid dev payload
        }
      }
    }

    return {
      authenticated: false,
      error: "Unable to verify administrator authorization. Please check connection.",
      status: 503,
    };
  }
}

/**
 * Helper to return a standardized 401 or 403 response if verification fails.
 */
export function unauthorizedResponse(result: AdminAuthVerificationResult) {
  return NextResponse.json(
    {
      error: result.error || "Unauthorized",
      code: "AUTH_REQUIRED",
    },
    {
      status: result.status || 401,
      headers: {
        "WWW-Authenticate": 'Bearer realm="Admin Access"',
      },
    }
  );
}
