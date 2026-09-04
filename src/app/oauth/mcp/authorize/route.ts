import { MCP_SCOPE } from "@/config";
import { isRedirectAllowed, resolveClient } from "@/auth/mcp/clients";
import { mcpAuthorizeRedirectUrl, oauthRedirect } from "@/auth/mcp/complete";
import type { PendingMcpAuthorize } from "@/auth/mcp/pending";
import { createMcpSessionId } from "@/auth/mcp/tokens";
import { buildTikTokAuthUrl, createTikTokOAuthState } from "@/auth/tiktok/oauth";
import { oauthCookieHeaders, requestIsHttps } from "@/security/cookies";
import { logger } from "@/security/logger";
import { isTikTokConnected } from "@/tiktok/services/token";
import { escapeHtml, htmlResponse, pageHtml } from "@/utils/html";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AuthorizeQuery {
  responseType: string | null;
  clientId: string | null;
  redirectUri: string | null;
  state: string | null;
  codeChallenge: string | null;
  codeChallengeMethod: string | null;
  scope: string | null;
}

function readQuery(url: URL): AuthorizeQuery {
  return {
    responseType: url.searchParams.get("response_type"),
    clientId: url.searchParams.get("client_id"),
    redirectUri: url.searchParams.get("redirect_uri"),
    state: url.searchParams.get("state"),
    codeChallenge: url.searchParams.get("code_challenge"),
    codeChallengeMethod: url.searchParams.get("code_challenge_method"),
    scope: url.searchParams.get("scope"),
  };
}

async function validateRequest(query: AuthorizeQuery) {
  if (query.responseType !== "code" || !query.clientId || !query.redirectUri) {
    throw new Error("The authorization request is missing response_type, client_id, or redirect_uri.");
  }
  if (!query.codeChallenge || query.codeChallengeMethod !== "S256") {
    throw new Error("This server requires PKCE with code_challenge_method=S256.");
  }

  const client = await resolveClient(query.clientId);
  if (!isRedirectAllowed(client, query.redirectUri)) {
    throw new Error("The redirect_uri is not registered for this client.");
  }
  return client;
}

export async function GET(req: Request) {
  const query = readQuery(new URL(req.url));
  try {
    const client = await validateRequest(query);
    const pending: PendingMcpAuthorize = {
      clientId: query.clientId as string,
      redirectUri: query.redirectUri as string,
      codeChallenge: query.codeChallenge as string,
      scope: query.scope || MCP_SCOPE,
      state: query.state,
      exp: Date.now() + 15 * 60 * 1000,
    };

    if (await isTikTokConnected()) {
      logger.info("MCP authorize: TikTok already connected", { displayHost: client.displayHost });
      return oauthRedirect(mcpAuthorizeRedirectUrl(pending, createMcpSessionId()));
    }

    const tiktokState = createTikTokOAuthState();
    const headers = new Headers({ Location: buildTikTokAuthUrl(tiktokState) });
    for (const cookie of oauthCookieHeaders({
      state: tiktokState,
      pending,
      secure: requestIsHttps(req),
    })) {
      headers.append("Set-Cookie", cookie);
    }
    logger.info("MCP authorize: starting TikTok OAuth", { displayHost: client.displayHost });
    return new Response(null, { status: 302, headers });
  } catch (error) {
    return htmlResponse(
      pageHtml(
        "Authorization request rejected",
        `<h1>Authorization request rejected</h1><p class="error">${escapeHtml(
          error instanceof Error ? error.message : "Invalid request",
        )}</p>`,
      ),
      400,
    );
  }
}

export async function POST(req: Request) {
  return GET(
    new Request(`${new URL(req.url).origin}/oauth/mcp/authorize?${new URL(req.url).searchParams}`, {
      method: "GET",
      headers: req.headers,
    }),
  );
}
