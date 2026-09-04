export interface TikTokStoredTokens {
  accessToken: string;
  refreshToken?: string;
  accessTokenExpiresAt?: number;
  advertiserIds: string[];
  updatedAt: number;
}

export interface TikTokTokenStore {
  read(): Promise<TikTokStoredTokens | undefined>;
  write(tokens: TikTokStoredTokens): Promise<void>;
  clear(): Promise<void>;
}
