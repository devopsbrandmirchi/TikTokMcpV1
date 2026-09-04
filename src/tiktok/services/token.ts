import { getConfig } from "@/config";
import { exchangeTikTokAuthCode, refreshTikTokAccessToken, revokeTikTokAccessToken } from "@/auth/tiktok/oauth";
import { TikTokAuthenticationError, TikTokAuthorizationError } from "@/tiktok/errors";
import { getTikTokTokenStore } from "@/tiktok/store";
import type { TikTokStoredTokens } from "@/tiktok/store/types";

const REFRESH_SKEW_MS = 5 * 60 * 1000;
const DEFAULT_ACCESS_TTL_MS = 24 * 60 * 60 * 1000;

function expiresAtFrom(expiresInSeconds?: number): number | undefined {
  if (!expiresInSeconds || expiresInSeconds <= 0) {
    return Date.now() + DEFAULT_ACCESS_TTL_MS;
  }
  return Date.now() + expiresInSeconds * 1000;
}

function assertConfiguredAdvertiser(advertiserIds: string[]): void {
  const configured = getConfig().tiktokAdvertiserId;
  if (advertiserIds.length > 0 && !advertiserIds.includes(configured)) {
    throw new TikTokAuthorizationError(
      `The TikTok authorization did not include the configured advertiser ${configured}. Authorize that advertiser, or update TIKTOK_ADVERTISER_ID.`,
    );
  }
}

export function toStoredTokens(params: {
  accessToken: string;
  refreshToken?: string;
  advertiserIds?: string[];
  expiresInSeconds?: number;
  previous?: TikTokStoredTokens;
}): TikTokStoredTokens {
  return {
    accessToken: params.accessToken,
    refreshToken: params.refreshToken ?? params.previous?.refreshToken,
    accessTokenExpiresAt: expiresAtFrom(params.expiresInSeconds),
    advertiserIds: params.advertiserIds ?? params.previous?.advertiserIds ?? [],
    updatedAt: Date.now(),
  };
}

export async function isTikTokConnected(): Promise<boolean> {
  const tokens = await getTikTokTokenStore().read();
  return Boolean(tokens?.accessToken);
}

export async function storeTikTokAuthResult(authCode: string): Promise<TikTokStoredTokens> {
  const exchanged = await exchangeTikTokAuthCode(authCode);
  assertConfiguredAdvertiser(exchanged.advertiserIds);
  const stored = toStoredTokens(exchanged);
  await getTikTokTokenStore().write(stored);
  return stored;
}

export async function getTikTokAccessToken(): Promise<string> {
  const store = getTikTokTokenStore();
  const tokens = await store.read();
  if (!tokens?.accessToken) {
    throw new TikTokAuthenticationError(
      "TikTok is not connected. Complete the Claude.ai Custom Connector authorization so this server can obtain a TikTok Marketing API token.",
    );
  }

  const expired =
    typeof tokens.accessTokenExpiresAt === "number" &&
    tokens.accessTokenExpiresAt - REFRESH_SKEW_MS <= Date.now();

  if (expired && tokens.refreshToken) {
    return refreshAndStoreTikTokToken(tokens);
  }
  return tokens.accessToken;
}

export async function refreshAndStoreTikTokToken(current?: TikTokStoredTokens): Promise<string> {
  const store = getTikTokTokenStore();
  const tokens = current ?? (await store.read());
  if (!tokens?.refreshToken) {
    throw new TikTokAuthenticationError(
      "The TikTok access token is no longer valid and no refresh token is stored. Reconnect the advertiser.",
    );
  }

  const refreshed = await refreshTikTokAccessToken(tokens.refreshToken);
  const stored = toStoredTokens({ ...refreshed, previous: tokens });
  await store.write(stored);
  return stored.accessToken;
}

export async function disconnectTikTok(): Promise<void> {
  const store = getTikTokTokenStore();
  const tokens = await store.read();
  if (tokens?.accessToken) {
    try {
      await revokeTikTokAccessToken(tokens.accessToken);
    } catch {
      // Still clear local storage so the next connect starts cleanly.
    }
  }
  await store.clear();
}

export function resolveAdvertiserId(advertiserId?: string): string {
  return advertiserId?.trim() || getConfig().tiktokAdvertiserId;
}
