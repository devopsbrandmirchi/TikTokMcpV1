import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { getConfig } from "@/config";
import { decryptStoredTokens, encryptStoredTokens } from "@/security/crypto";
import { logger } from "@/security/logger";
import { TikTokAuthorizationError } from "@/tiktok/errors";
import type { TikTokStoredTokens, TikTokTokenStore } from "@/tiktok/store/types";

function secretManagerSetupError(action: "read" | "write", cause: unknown): never {
  const config = getConfig();
  const secretName = config.tiktokTokenSecretName ?? "tiktok-mcp-v1-tokens";
  const reason = cause instanceof Error ? cause.message : "unknown";
  logger.error("Secret Manager TikTok token store failed", { action, secretName, reason });
  throw new TikTokAuthorizationError(
    `This Cloud Run service cannot ${action} TikTok tokens in Secret Manager secret "${secretName}". ` +
      "Create that secret if it is missing, then grant the Cloud Run runtime service account " +
      "roles/secretmanager.secretAccessor and roles/secretmanager.secretVersionManager on it. " +
      "See docs/DEPLOYMENT.md.",
    { cause },
  );
}

export class SecretManagerTikTokTokenStore implements TikTokTokenStore {
  private readonly client = new SecretManagerServiceClient();

  private secretPath(): string {
    const config = getConfig();
    return `projects/${config.googleCloudProject}/secrets/${config.tiktokTokenSecretName}`;
  }

  async read(): Promise<TikTokStoredTokens | undefined> {
    try {
      const [version] = await this.client.accessSecretVersion({
        name: `${this.secretPath()}/versions/latest`,
      });
      const payload = version.payload?.data;
      if (!payload) {
        return undefined;
      }
      const text = typeof payload === "string" ? payload : Buffer.from(payload).toString("utf8");
      if (!text.trim()) {
        return undefined;
      }
      return decryptStoredTokens<TikTokStoredTokens>(text.trim());
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      if (message.includes("NOT_FOUND")) {
        return undefined;
      }
      if (message.includes("PERMISSION_DENIED") || message.includes("secretmanager.versions.access")) {
        secretManagerSetupError("read", error);
      }
      throw error;
    }
  }

  async write(tokens: TikTokStoredTokens): Promise<void> {
    const secretId = getConfig().tiktokTokenSecretName;
    if (!secretId) {
      throw new Error("TIKTOK_TOKEN_SECRET_NAME is required for Secret Manager storage.");
    }

    // secretAccessor + secretVersionManager can access/add versions, but cannot
    // getSecret or createSecret. The setup script must create the secret first.
    try {
      await this.client.addSecretVersion({
        parent: this.secretPath(),
        payload: { data: Buffer.from(encryptStoredTokens(tokens), "utf8") },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      if (
        message.includes("PERMISSION_DENIED") ||
        message.includes("NOT_FOUND") ||
        message.includes("secretmanager.")
      ) {
        secretManagerSetupError("write", error);
      }
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      await this.client.addSecretVersion({
        parent: this.secretPath(),
        payload: { data: Buffer.from("", "utf8") },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      if (message.includes("PERMISSION_DENIED") || message.includes("secretmanager.")) {
        secretManagerSetupError("write", error);
      }
      throw error;
    }
  }
}
