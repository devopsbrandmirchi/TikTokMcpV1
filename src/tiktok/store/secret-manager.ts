import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { getConfig } from "@/config";
import { decryptStoredTokens, encryptStoredTokens } from "@/security/crypto";
import { logger } from "@/security/logger";
import type { TikTokStoredTokens, TikTokTokenStore } from "@/tiktok/store/types";

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
      throw error;
    }
  }

  async write(tokens: TikTokStoredTokens): Promise<void> {
    const config = getConfig();
    const parent = `projects/${config.googleCloudProject}`;
    const secretId = config.tiktokTokenSecretName;
    if (!secretId) {
      throw new Error("TIKTOK_TOKEN_SECRET_NAME is required for Secret Manager storage.");
    }

    try {
      await this.client.getSecret({ name: this.secretPath() });
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      if (message.includes("NOT_FOUND")) {
        await this.client.createSecret({
          parent,
          secretId,
          secret: { replication: { automatic: {} } },
        });
        logger.info("Created Secret Manager secret for TikTok tokens");
      } else {
        throw error;
      }
    }

    await this.client.addSecretVersion({
      parent: this.secretPath(),
      payload: { data: Buffer.from(encryptStoredTokens(tokens), "utf8") },
    });
  }

  async clear(): Promise<void> {
    await this.client.addSecretVersion({
      parent: this.secretPath(),
      payload: { data: Buffer.from("", "utf8") },
    });
  }
}
