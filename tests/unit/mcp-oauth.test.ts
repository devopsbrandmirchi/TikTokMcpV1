import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createDcrClientId, isRedirectAllowed, resolveClient, verifyPkce } from "@/auth/mcp/clients";
import { nowSeconds, signJwt } from "@/auth/mcp/jwt";
import { authorizationServerMetadata, protectedResourceMetadata } from "@/auth/mcp/metadata";
import {
  issueAccessToken,
  issueAuthorizationCode,
  issueRefreshToken,
  readAccessToken,
  readAuthorizationCode,
  readRefreshToken,
} from "@/auth/mcp/tokens";
import { CLAUDE_AI_CALLBACK } from "@/auth/mcp/clients";
import { setRequiredEnv } from "../env";

setRequiredEnv();

describe("MCP OAuth", () => {
  it("publishes authorization server and protected resource metadata", () => {
    const as = authorizationServerMetadata();
    expect(as.authorization_endpoint).toContain("/oauth/mcp/authorize");
    expect(as.token_endpoint).toContain("/oauth/mcp/token");
    expect(as.registration_endpoint).toContain("/oauth/mcp/register");
    expect(as.code_challenge_methods_supported).toEqual(["S256"]);
    expect(as.client_id_metadata_document_supported).toBe(true);
    expect(protectedResourceMetadata().resource).toBe("https://tiktok-mcp.example.com/mcp");
  });

  it("creates a DCR client_id that can be resolved", async () => {
    const clientId = createDcrClientId({
      redirectUris: [CLAUDE_AI_CALLBACK],
      tokenEndpointAuthMethod: "none",
    });
    const client = await resolveClient(clientId);
    expect(client.redirectUris).toContain(CLAUDE_AI_CALLBACK);
    expect(isRedirectAllowed(client, CLAUDE_AI_CALLBACK)).toBe(true);
    expect(isRedirectAllowed(client, "https://evil.example/callback")).toBe(false);
  });

  it("resolves Claude CIMD host client_ids", async () => {
    const client = await resolveClient("https://claude.ai");
    expect(client.redirectUris).toContain(CLAUDE_AI_CALLBACK);
  });

  it("verifies PKCE S256", () => {
    const verifier = "test-verifier-abcdefghijklmnopqrstuvwxyz";
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    expect(verifyPkce(verifier, challenge)).toBe(true);
    expect(verifyPkce("wrong", challenge)).toBe(false);
  });

  it("issues and reads authorization codes, access tokens, and refresh tokens", () => {
    const code = issueAuthorizationCode({
      clientId: "https://claude.ai",
      redirectUri: CLAUDE_AI_CALLBACK,
      codeChallenge: "abc",
    });
    const codePayload = readAuthorizationCode(code);
    expect(codePayload.typ).toBe("code");
    expect(codePayload.sub).toBe("tiktok-mcp-v1");

    const access = issueAccessToken({ clientId: "https://claude.ai" });
    expect(readAccessToken(access).aud).toBe("https://tiktok-mcp.example.com/mcp");

    const refresh = issueRefreshToken({ clientId: "https://claude.ai" });
    expect(readRefreshToken(refresh).typ).toBe("refresh");
  });

  it("rejects expired access tokens", () => {
    const expired = signJwt({
      typ: "access",
      iss: "https://tiktok-mcp.example.com",
      aud: "https://tiktok-mcp.example.com/mcp",
      sub: "tiktok-mcp-v1",
      client_id: "x",
      scope: "tiktokmcp:read",
      iat: nowSeconds() - 120,
      exp: nowSeconds() - 60,
    });
    expect(() => readAccessToken(expired)).toThrow(/expired|Invalid/i);
  });
});
