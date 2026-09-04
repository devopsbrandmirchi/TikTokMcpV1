import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { POST as register } from "@/app/oauth/mcp/register/route";
import { POST as token } from "@/app/oauth/mcp/token/route";
import { CLAUDE_AI_CALLBACK } from "@/auth/mcp/clients";
import { issueAuthorizationCode } from "@/auth/mcp/tokens";
import { setRequiredEnv } from "../env";

setRequiredEnv();

describe("MCP OAuth routes", () => {
  it("registers a DCR client", async () => {
    const response = await register(
      new Request("https://tiktok-mcp.example.com/oauth/mcp/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          redirect_uris: [CLAUDE_AI_CALLBACK],
          client_name: "Claude",
        }),
      }),
    );
    expect(response.status).toBe(201);
    const body = (await response.json()) as { client_id: string };
    expect(body.client_id.startsWith("dcr.")).toBe(true);
  });

  it("exchanges an authorization code with PKCE and rejects a bad verifier", async () => {
    const verifier = "abcdefghijklmnopqrstuvwxyz0123456789";
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    const clientId = "https://claude.ai";
    const code = issueAuthorizationCode({
      clientId,
      redirectUri: CLAUDE_AI_CALLBACK,
      codeChallenge: challenge,
    });

    const ok = await token(
      new Request("https://tiktok-mcp.example.com/oauth/mcp/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: clientId,
          code,
          redirect_uri: CLAUDE_AI_CALLBACK,
          code_verifier: verifier,
        }),
      }),
    );
    expect(ok.status).toBe(200);
    const issued = (await ok.json()) as { access_token: string; refresh_token: string; token_type: string };
    expect(issued.token_type).toBe("Bearer");
    expect(issued.access_token).toBeTruthy();

    const bad = await token(
      new Request("https://tiktok-mcp.example.com/oauth/mcp/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: clientId,
          code: issueAuthorizationCode({
            clientId,
            redirectUri: CLAUDE_AI_CALLBACK,
            codeChallenge: challenge,
          }),
          redirect_uri: CLAUDE_AI_CALLBACK,
          code_verifier: "wrong-verifier-abcdefghijklmnopqrstuvwxyz",
        }),
      }),
    );
    expect(bad.status).toBe(400);
  });
});
