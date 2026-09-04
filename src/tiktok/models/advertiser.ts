export interface TikTokAdvertiser {
  advertiser_id: string;
  advertiser_name?: string;
  status?: string;
  currency?: string;
  timezone?: string;
  display_timezone?: string;
  country?: string;
  company?: string;
  create_time?: string;
  balance?: number;
}

export const ADVERTISER_FIELDS = [
  "advertiser_id",
  "name",
  "status",
  "currency",
  "timezone",
  "display_timezone",
  "country",
  "company",
  "create_time",
  "balance",
] as const;
