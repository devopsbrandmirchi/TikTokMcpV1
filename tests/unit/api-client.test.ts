import { afterEach, describe, expect, it, vi } from "vitest";
import { TikTokApiClient } from "@/tiktok/client/client";
import {
  TikTokAuthenticationError,
  TikTokRateLimitError,
  TikTokValidationError,
} from "@/tiktok/errors";
import { MemoryTikTokTokenStore } from "@/tiktok/store/memory";
import { resetTikTokTokenStore, setTikTokTokenStore } from "@/tiktok/store";
import { setRequiredEnv } from "../env";

setRequiredEnv();

function jsonResponse(body: unknown, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  resetTikTokTokenStore();
});

function withTokenStore(includeRefresh = true) {
  const store = new MemoryTikTokTokenStore();
  void store.write({
    accessToken: "access",
    refreshToken: includeRefresh ? "refresh" : undefined,
    advertiserIds: ["1234567890123456789"],
    updatedAt: Date.now(),
    accessTokenExpiresAt: Date.now() + 60 * 60 * 1000,
  });
  setTikTokTokenStore(store);
}

describe("TikTokApiClient", () => {
  it("returns 200 envelopes", async () => {
    withTokenStore();
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ code: 0, data: { ok: true } })));
    const client = new TikTokApiClient();
    const result = await client.get<{ ok: boolean }>("/campaign/get/", { advertiser_id: "1" });
    expect(result.data?.ok).toBe(true);
  });

  it("maps 400 validation, 401 auth, 429 rate limit, and malformed JSON", async () => {
    withTokenStore(false);
    const client = new TikTokApiClient();

    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ code: 40000, message: "bad" }, 400)));
    await expect(client.get("/campaign/get/")).rejects.toBeInstanceOf(TikTokValidationError);

    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ code: 40001, message: "auth" }, 401)));
    await expect(client.get("/campaign/get/")).rejects.toBeInstanceOf(TikTokAuthenticationError);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ code: 40100, message: "slow down" }, 429, { "Retry-After": "0" })),
    );
    await expect(client.get("/campaign/get/")).rejects.toBeInstanceOf(TikTokRateLimitError);

    vi.stubGlobal("fetch", vi.fn(async () => new Response("not-json", { status: 200 })));
    await expect(client.get("/campaign/get/")).rejects.toThrow(/malformed/i);
  });

  it("retries transient 500s then succeeds", async () => {
    withTokenStore();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ message: "down" }, 500, { "Retry-After": "0" }))
      .mockResolvedValueOnce(jsonResponse({ code: 0, data: { ok: true } }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new TikTokApiClient();
    const result = await client.get<{ ok: boolean }>("/campaign/get/");
    expect(result.data?.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
