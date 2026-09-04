import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { getConfig } from "@/config";
import { decryptStoredTokens, encryptStoredTokens } from "@/security/crypto";
import type { TikTokStoredTokens, TikTokTokenStore } from "@/tiktok/store/types";

export class FileTikTokTokenStore implements TikTokTokenStore {
  constructor(private readonly filePath = getConfig().tiktokTokenStorePath) {}

  async read(): Promise<TikTokStoredTokens | undefined> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      return decryptStoredTokens<TikTokStoredTokens>(raw.trim());
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return undefined;
      }
      throw error;
    }
  }

  async write(tokens: TikTokStoredTokens): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, encryptStoredTokens(tokens), { encoding: "utf8", mode: 0o600 });
  }

  async clear(): Promise<void> {
    try {
      await unlink(this.filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }
}
