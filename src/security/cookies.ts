import type { PendingMcpAuthorize } from "@/auth/mcp/pending";
import { decryptCookiePayload, encryptCookiePayload } from "@/security/crypto";

export const STATE_COOKIE = "tiktokmcp_oauth_state";
export const PENDING_COOKIE = "tiktokmcp_mcp_pending";
const MAX_AGE_SECONDS = 15 * 60;

function cookieBase(secure: boolean, maxAge = MAX_AGE_SECONDS): string {
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}

function expiredCookie(name: string, secure: boolean): string {
  return `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;
}

function readCookieMap(req: Request): Record<string, string> {
  const cookie = req.headers.get("cookie");
  if (!cookie) {
    return {};
  }
  return Object.fromEntries(
    cookie.split(";").map((part) => {
      const [name, ...rest] = part.trim().split("=");
      return [name ?? "", decodeURIComponent(rest.join("="))];
    }),
  );
}

export function oauthCookieHeaders(params: {
  state: string;
  pending?: PendingMcpAuthorize | null;
  secure: boolean;
}): string[] {
  const base = cookieBase(params.secure);
  const cookies = [`${STATE_COOKIE}=${encodeURIComponent(params.state)}; ${base}`];
  if (params.pending) {
    cookies.push(
      `${PENDING_COOKIE}=${encodeURIComponent(encryptCookiePayload(params.pending))}; ${base}`,
    );
  }
  return cookies;
}

export function pendingCookieHeader(pending: PendingMcpAuthorize, secure: boolean): string {
  return `${PENDING_COOKIE}=${encodeURIComponent(encryptCookiePayload(pending))}; ${cookieBase(secure)}`;
}

export function clearOAuthCookieHeaders(secure: boolean): string[] {
  return [expiredCookie(STATE_COOKIE, secure), expiredCookie(PENDING_COOKIE, secure)];
}

export function readOAuthCookies(req: Request): {
  state?: string;
  pending?: PendingMcpAuthorize;
} {
  const values = readCookieMap(req);
  let pending: PendingMcpAuthorize | undefined;
  if (values[PENDING_COOKIE]) {
    try {
      pending = decryptCookiePayload<PendingMcpAuthorize>(values[PENDING_COOKIE]);
    } catch {
      pending = undefined;
    }
  }
  return {
    state: values[STATE_COOKIE],
    pending,
  };
}

export function requestIsHttps(req: Request): boolean {
  const forwarded = req.headers.get("x-forwarded-proto");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() === "https";
  }
  return new URL(req.url).protocol === "https:";
}
