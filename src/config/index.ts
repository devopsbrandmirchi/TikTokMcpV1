export const APP_VERSION = "1.0.0";
export const APP_NAME = "TikTokMcpV1";
export const MCP_INSTANCE_SUB = "tiktok-mcp-v1";

export const TIKTOK_API_VERSION = "v1.3";
export const DEFAULT_TIKTOK_API_BASE_URL = "https://business-api.tiktok.com/open_api/v1.3";
export const TIKTOK_AUTHORIZE_URL = "https://business-api.tiktok.com/portal/auth";

export const MCP_SCOPE = "tiktokmcp:read";

export interface AppConfig {
  appBaseUrl: string;
  tiktokAppId: string;
  tiktokAppSecret: string;
  tiktokAdvertiserId: string;
  tiktokRedirectUri: string;
  tiktokApiBaseUrl: string;
  mcpTokenSecret: string;
  oauthStateSecret: string;
  tokenEncryptionKey: string;
  tiktokTokenStorePath: string;
  googleCloudProject: string | undefined;
  tiktokTokenSecretName: string | undefined;
  mcpOAuthClientId: string | undefined;
  mcpOAuthClientSecret: string | undefined;
  logLevel: string;
  nodeEnv: string;
}

let cached: AppConfig | undefined;

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

export function getConfig(): AppConfig {
  if (cached) {
    return cached;
  }

  const appBaseUrl = stripTrailingSlash(required("APP_BASE_URL"));
  const tiktokRedirectUri =
    process.env.TIKTOK_REDIRECT_URI?.trim() || `${appBaseUrl}/oauth/tiktok/callback`;
  const tiktokApiBaseUrl = stripTrailingSlash(
    process.env.TIKTOK_API_BASE_URL?.trim() || DEFAULT_TIKTOK_API_BASE_URL,
  );

  cached = {
    appBaseUrl,
    tiktokAppId: required("TIKTOK_APP_ID"),
    tiktokAppSecret: required("TIKTOK_APP_SECRET"),
    tiktokAdvertiserId: required("TIKTOK_ADVERTISER_ID"),
    tiktokRedirectUri,
    tiktokApiBaseUrl,
    mcpTokenSecret: required("MCP_TOKEN_SECRET"),
    oauthStateSecret: required("OAUTH_STATE_SECRET"),
    tokenEncryptionKey: required("TOKEN_ENCRYPTION_KEY"),
    tiktokTokenStorePath: process.env.TIKTOK_TOKEN_STORE_PATH?.trim() || ".data/tiktok-tokens.enc",
    googleCloudProject: process.env.GOOGLE_CLOUD_PROJECT?.trim() || undefined,
    tiktokTokenSecretName: process.env.TIKTOK_TOKEN_SECRET_NAME?.trim() || undefined,
    mcpOAuthClientId: process.env.MCP_OAUTH_CLIENT_ID?.trim() || undefined,
    mcpOAuthClientSecret: process.env.MCP_OAUTH_CLIENT_SECRET?.trim() || undefined,
    logLevel: process.env.LOG_LEVEL?.trim() || "info",
    nodeEnv: process.env.NODE_ENV?.trim() || "development",
  };
  return cached;
}

export function resetConfig(): void {
  cached = undefined;
}

export function usesSecretManager(config: AppConfig = getConfig()): boolean {
  return Boolean(config.googleCloudProject && config.tiktokTokenSecretName);
}
