export interface TikTokAd {
  ad_id: string;
  ad_name?: string;
  adgroup_id?: string;
  campaign_id?: string;
  status?: string;
  operation_status?: string;
  landing_page_url?: string;
  ad_format?: string;
  ad_text?: string;
  create_time?: string;
  modify_time?: string;
}

export const AD_FIELDS = [
  "ad_id",
  "ad_name",
  "adgroup_id",
  "campaign_id",
  "status",
  "operation_status",
  "landing_page_url",
  "ad_format",
  "ad_text",
  "create_time",
  "modify_time",
] as const;
