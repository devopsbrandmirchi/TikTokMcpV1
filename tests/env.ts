import { resetConfig } from "@/config";

export function setRequiredEnv(): void {
  process.env.APP_BASE_URL = "https://tiktok-mcp.example.com";
  process.env.TIKTOK_APP_ID = "test-app-id";
  process.env.TIKTOK_APP_SECRET = "test-app-secret";
  process.env.TIKTOK_ADVERTISER_ID = "1234567890123456789";
  process.env.MCP_TOKEN_SECRET = "mcp-token-secret-for-tests-32bytes-min";
  process.env.OAUTH_STATE_SECRET = "oauth-state-secret-for-tests-32bytes";
  process.env.TOKEN_ENCRYPTION_KEY = "a".repeat(64);
  (process.env as { NODE_ENV?: string }).NODE_ENV = "test";
  delete process.env.GOOGLE_CLOUD_PROJECT;
  delete process.env.TIKTOK_TOKEN_SECRET_NAME;
  resetConfig();
}
