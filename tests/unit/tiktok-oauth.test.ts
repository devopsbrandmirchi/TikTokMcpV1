import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildTikTokAuthUrl,
  createTikTokOAuthState,
  exchangeTikTokAuthCode,
  tiktokStateMatches,
  verifyTikTokOAuthState,
} from "@/auth/tiktok/oauth";
import { MemoryTikTokTokenStore } from "@/tiktok/store/memory";
import { resetTikTokTokenStore, setTikTokTokenStore } from "@/tiktok/store";
import { storeTikTokAuthResult } from "@/tiktok/services/token";
import { tokenExchangeFixture } from "../fixtures/tiktok";
import { setRequiredEnv } from "../env";

setRequiredEnv();

afterEach(() => {
  vi.unstubAllGlobals();
  resetTikTokTokenStore();
});

describe("TikTok OAuth", () => {
  it("builds the official portal authorization URL", () => {
    const url = new URL(buildTikTokAuthUrl("state-1"));
    expect(url.origin + url.pathname).toBe("https://business-api.tiktok.com/portal/auth");
    expect(url.searchParams.get("app_id")).toBe("test-app-id");
    expect(url.searchParams.get("redirect_uri")).toContain("/oauth/tiktok/callback");
    expect(url.searchParams.get("state")).toBe("state-1");
  });

  it("signs and verifies TikTok OAuth state", () => {
    const state = createTikTokOAuthState();
    const payload = verifyTikTokOAuthState(state);
    expect(payload.typ).toBe("tiktok_oauth");
    expect(tiktokStateMatches(state, state)).toBe(true);
    expect(tiktokStateMatches(state, "other")).toBe(false);
  });

  it("exchanges an auth code and stores tokens", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(tokenExchangeFixture), { status: 200 })),
    );
    const store = new MemoryTikTokTokenStore();
    setTikTokTokenStore(store);
    const result = await exchangeTikTokAuthCode("auth-code");
    expect(result.accessToken).toBe("tiktok-access-token");
    expect(result.advertiserIds).toContain("1234567890123456789");

    await storeTikTokAuthResult("auth-code");
    const stored = await store.read();
    expect(stored?.accessToken).toBe("tiktok-access-token");
    expect(stored?.refreshToken).toBe("tiktok-refresh-token");
  });

  it("rejects authorization that does not include the configured advertiser", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              code: 0,
              data: { access_token: "x", advertiser_ids: ["999"] },
            }),
            { status: 200 },
          ),
      ),
    );
    setTikTokTokenStore(new MemoryTikTokTokenStore());
    await expect(storeTikTokAuthResult("auth-code")).rejects.toThrow(/configured advertiser/);
  });
});
