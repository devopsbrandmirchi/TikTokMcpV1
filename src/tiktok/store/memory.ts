import type { TikTokStoredTokens, TikTokTokenStore } from "@/tiktok/store/types";

export class MemoryTikTokTokenStore implements TikTokTokenStore {
  private tokens: TikTokStoredTokens | undefined;

  async read(): Promise<TikTokStoredTokens | undefined> {
    return this.tokens ? { ...this.tokens } : undefined;
  }

  async write(tokens: TikTokStoredTokens): Promise<void> {
    this.tokens = { ...tokens };
  }

  async clear(): Promise<void> {
    this.tokens = undefined;
  }
}
