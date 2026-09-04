import { randomBytes } from "node:crypto";
import { getConfig, TIKTOK_AUTHORIZE_URL } from "@/config";
import { nowSeconds, signJwt, verifyJwt } from "@/auth/mcp/jwt";
import { tokensEqual } from "@/security/compare";

const STATE_TTL_SECONDS = 15 * 60;

export interface TikTokOAuthState {
  typ: "tiktok_oauth";
  nonce: string;
  exp: number;
  iat: number;
}

export function createTikTokOAuthState(): string {
  return signJwt(
    {
      typ: "tiktok_oauth",
      nonce: randomBytes(16).toString("hex"),
      iat: nowSeconds(),
      exp: nowSeconds() + STATE_TTL_SECONDS,
    },
    getConfig().oauthStateSecret,
  );
}

export function verifyTikTokOAuthState(state: string): TikTokOAuthState {
  const payload = verifyJwt<TikTokOAuthState>(state, getConfig().oauthStateSecret);
  if (payload.typ !== "tiktok_oauth" || !payload.nonce) {
    throw new Error("Invalid TikTok OAuth state.");
  }
  return payload;
}

export function tiktokStateMatches(presented: string | undefined, expected: string | undefined): boolean {
  if (!presented || !expected) {
    return false;
  }
  return tokensEqual(presented, expected);
}

export function buildTikTokAuthUrl(state: string): string {
  const config = getConfig();
  const url = new URL(TIKTOK_AUTHORIZE_URL);
  url.searchParams.set("app_id", config.tiktokAppId);
  url.searchParams.set("redirect_uri", config.tiktokRedirectUri);
  url.searchParams.set("state", state);
  return url.toString();
}

export interface TikTokTokenResponse {
  accessToken: string;
  refreshToken?: string;
  advertiserIds: string[];
  scope: unknown;
  expiresInSeconds?: number;
}

interface TikTokOauthJson {
  code?: number;
  message?: string;
  data?: {
    access_token?: string;
    refresh_token?: string;
    advertiser_ids?: Array<string | number>;
    scope?: unknown;
    expires_in?: number;
  };
}

async function postTikTokOAuth(path: string, body: Record<string, string>): Promise<TikTokTokenResponse> {
  const config = getConfig();
  const response = await fetch(`${config.tiktokApiBaseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  let json: TikTokOauthJson;
  try {
    json = (await response.json()) as TikTokOauthJson;
  } catch {
    throw new Error("TikTok returned a malformed OAuth response.");
  }

  if (!response.ok || json.code !== 0 || !json.data?.access_token) {
    throw new Error(
      json.message ||
        `TikTok rejected the OAuth request${json.code !== undefined ? ` (code ${json.code})` : ""}.`,
    );
  }

  return {
    accessToken: json.data.access_token,
    refreshToken: json.data.refresh_token,
    advertiserIds: (json.data.advertiser_ids ?? []).map((id) => String(id)),
    scope: json.data.scope,
    expiresInSeconds: json.data.expires_in,
  };
}

export async function exchangeTikTokAuthCode(authCode: string): Promise<TikTokTokenResponse> {
  const config = getConfig();
  return postTikTokOAuth("/oauth2/access_token/", {
    app_id: config.tiktokAppId,
    secret: config.tiktokAppSecret,
    auth_code: authCode,
    grant_type: "authorization_code",
  });
}

export async function refreshTikTokAccessToken(refreshToken: string): Promise<TikTokTokenResponse> {
  const config = getConfig();
  return postTikTokOAuth("/oauth2/refresh_token/", {
    app_id: config.tiktokAppId,
    secret: config.tiktokAppSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
}

export async function revokeTikTokAccessToken(accessToken: string): Promise<void> {
  const config = getConfig();
  const response = await fetch(`${config.tiktokApiBaseUrl}/oauth2/revoke_token/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      app_id: config.tiktokAppId,
      secret: config.tiktokAppSecret,
      access_token: accessToken,
    }),
  });
  if (!response.ok) {
    throw new Error("TikTok token revocation failed.");
  }
}
