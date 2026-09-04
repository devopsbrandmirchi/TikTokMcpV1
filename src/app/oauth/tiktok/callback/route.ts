import { mcpAuthorizeRedirectUrl, oauthRedirect } from "@/auth/mcp/complete";
import { assertPendingMcpAuthorize } from "@/auth/mcp/pending";
import { createMcpSessionId } from "@/auth/mcp/tokens";
import { tiktokStateMatches, verifyTikTokOAuthState } from "@/auth/tiktok/oauth";
import { clearOAuthCookieHeaders, readOAuthCookies, requestIsHttps } from "@/security/cookies";
import { logger } from "@/security/logger";
import { storeTikTokAuthResult } from "@/tiktok/services/token";
import { escapeHtml, htmlResponse, pageHtml } from "@/utils/html";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const authCode = url.searchParams.get("auth_code") ?? url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookies = readOAuthCookies(req);
  const secure = requestIsHttps(req);

  try {
    if (!authCode) {
      throw new Error("TikTok did not return an authorization code.");
    }
    if (!tiktokStateMatches(state ?? undefined, cookies.state) || !state) {
      throw new Error("TikTok OAuth state validation failed. Start the connector again.");
    }
    verifyTikTokOAuthState(state);

    await storeTikTokAuthResult(authCode);
    logger.info("TikTok OAuth callback stored tokens");

    const pending = cookies.pending ? assertPendingMcpAuthorize(cookies.pending) : undefined;
    const headers = new Headers();
    for (const cookie of clearOAuthCookieHeaders(secure)) {
      headers.append("Set-Cookie", cookie);
    }

    if (pending) {
      return oauthRedirect(mcpAuthorizeRedirectUrl(pending, createMcpSessionId()), headers);
    }

    return htmlResponse(
      pageHtml(
        "TikTok connected",
        "<h1>TikTok advertiser connected</h1><p>You can close this window and return to Claude.ai.</p>",
      ),
      200,
      headers,
    );
  } catch (error) {
    logger.error("TikTok OAuth callback failed", {
      reason: error instanceof Error ? error.message : "unknown",
    });
    return htmlResponse(
      pageHtml(
        "TikTok authorization failed",
        `<h1>TikTok authorization failed</h1><p class="error">${escapeHtml(
          error instanceof Error ? error.message : "Authorization failed",
        )}</p>`,
      ),
      400,
    );
  }
}
