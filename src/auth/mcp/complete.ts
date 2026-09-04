import { MCP_SCOPE } from "@/config";
import { issueAuthorizationCode } from "@/auth/mcp/tokens";
import type { PendingMcpAuthorize } from "@/auth/mcp/pending";

export function mcpAuthorizeRedirectUrl(pending: PendingMcpAuthorize, sessionId?: string): string {
  const code = issueAuthorizationCode({
    clientId: pending.clientId,
    redirectUri: pending.redirectUri,
    codeChallenge: pending.codeChallenge,
    sid: sessionId,
    scope: pending.scope || MCP_SCOPE,
  });

  const url = new URL(pending.redirectUri);
  url.searchParams.set("code", code);
  if (pending.state) {
    url.searchParams.set("state", pending.state);
  }
  return url.toString();
}

export function oauthRedirect(location: string, extraHeaders?: HeadersInit): Response {
  const headers = new Headers({ Location: location });
  if (extraHeaders) {
    new Headers(extraHeaders).forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie") {
        headers.append(key, value);
      } else {
        headers.set(key, value);
      }
    });
  }
  return new Response(null, {
    status: 302,
    headers,
  });
}
