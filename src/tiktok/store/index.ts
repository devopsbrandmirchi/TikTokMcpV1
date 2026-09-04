import { usesSecretManager } from "@/config";
import { FileTikTokTokenStore } from "@/tiktok/store/file";
import { MemoryTikTokTokenStore } from "@/tiktok/store/memory";
import { SecretManagerTikTokTokenStore } from "@/tiktok/store/secret-manager";
import type { TikTokTokenStore } from "@/tiktok/store/types";

export type { TikTokStoredTokens, TikTokTokenStore } from "@/tiktok/store/types";

let store: TikTokTokenStore | undefined;

export function createTikTokTokenStore(): TikTokTokenStore {
  if (process.env.NODE_ENV === "test" || process.env.VITEST) {
    return new MemoryTikTokTokenStore();
  }
  if (usesSecretManager()) {
    return new SecretManagerTikTokTokenStore();
  }
  return new FileTikTokTokenStore();
}

export function getTikTokTokenStore(): TikTokTokenStore {
  if (!store) {
    store = createTikTokTokenStore();
  }
  return store;
}

export function setTikTokTokenStore(next: TikTokTokenStore): void {
  store = next;
}

export function resetTikTokTokenStore(): void {
  store = undefined;
}
