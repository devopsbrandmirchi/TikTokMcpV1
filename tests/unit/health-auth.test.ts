import { afterEach, describe, expect, it } from "vitest";
import { GET as healthGet } from "@/app/health/route";
import { GET as statusGet } from "@/app/auth/status/route";
import { GET as asMetadata } from "@/app/.well-known/oauth-authorization-server/route";
import { GET as resourceMetadata } from "@/app/.well-known/oauth-protected-resource/mcp/route";
import { MemoryTikTokTokenStore } from "@/tiktok/store/memory";
import { resetTikTokTokenStore, setTikTokTokenStore } from "@/tiktok/store";
import { unauthorizedMcpResponse } from "@/mcp/server";
import { setRequiredEnv } from "../env";

setRequiredEnv();

afterEach(() => {
  resetTikTokTokenStore();
});

describe("HTTP endpoints", () => {
  it("returns a safe health payload", async () => {
    const response = healthGet();
    const body = (await response.json()) as { status: string; service: string };
    expect(body.status).toBe("ok");
    expect(body.service).toBe("TikTokMcpV1");
    expect(JSON.stringify(body)).not.toMatch(/token|secret/i);
  });

  it("returns auth status without secrets", async () => {
    setTikTokTokenStore(new MemoryTikTokTokenStore());
    const body = (await (await statusGet()).json()) as Record<string, unknown>;
    expect(body.tiktok_connected).toBe(false);
    expect(body.advertiser_configured).toBe(true);
    expect(JSON.stringify(body)).not.toMatch(/access_token|refresh_token|secret/i);
  });

  it("exposes OAuth discovery documents", async () => {
    const as = await (await asMetadata()).json();
    const resource = await (await resourceMetadata()).json();
    expect(as.issuer).toBe("https://tiktok-mcp.example.com");
    expect(resource.resource).toBe("https://tiktok-mcp.example.com/mcp");
  });

  it("returns 401 with WWW-Authenticate for unauthorized MCP calls", () => {
    const response = unauthorizedMcpResponse();
    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toContain("oauth-protected-resource/mcp");
  });
});
