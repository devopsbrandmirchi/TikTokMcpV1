import { TikTokValidationError } from "@/tiktok/errors";

export type ReportDimension = "campaign" | "ad_group" | "ad";

export interface MetricDefinition {
  mcpName: string;
  tiktokField: string;
  source: "tiktok";
  description: string;
}

export const REPORT_METRICS: Record<string, MetricDefinition> = {
  impressions: {
    mcpName: "impressions",
    tiktokField: "impressions",
    source: "tiktok",
    description: "Number of times ads were shown.",
  },
  clicks: {
    mcpName: "clicks",
    tiktokField: "clicks",
    source: "tiktok",
    description: "Number of clicks.",
  },
  spend: {
    mcpName: "spend",
    tiktokField: "spend",
    source: "tiktok",
    description: "Amount spent in the advertiser currency.",
  },
  conversions: {
    mcpName: "conversions",
    tiktokField: "conversion",
    source: "tiktok",
    description: "TikTok conversion count. Not comparable to Google Ads or Microsoft Advertising conversions.",
  },
  ctr: {
    mcpName: "ctr",
    tiktokField: "ctr",
    source: "tiktok",
    description: "Click-through rate supplied by TikTok.",
  },
  cpc: {
    mcpName: "cpc",
    tiktokField: "cpc",
    source: "tiktok",
    description: "Cost per click supplied by TikTok.",
  },
  cpm: {
    mcpName: "cpm",
    tiktokField: "cpm",
    source: "tiktok",
    description: "Cost per thousand impressions supplied by TikTok.",
  },
  conversion_rate: {
    mcpName: "conversion_rate",
    tiktokField: "conversion_rate",
    source: "tiktok",
    description: "TikTok conversion rate.",
  },
  reach: {
    mcpName: "reach",
    tiktokField: "reach",
    source: "tiktok",
    description: "Unique users reached.",
  },
  frequency: {
    mcpName: "frequency",
    tiktokField: "frequency",
    source: "tiktok",
    description: "Average impressions per reached user.",
  },
  video_play_actions: {
    mcpName: "video_play_actions",
    tiktokField: "video_play_actions",
    source: "tiktok",
    description: "Video play actions.",
  },
  video_watched_2s: {
    mcpName: "video_watched_2s",
    tiktokField: "video_watched_2s",
    source: "tiktok",
    description: "2-second video views.",
  },
  video_watched_6s: {
    mcpName: "video_watched_6s",
    tiktokField: "video_watched_6s",
    source: "tiktok",
    description: "6-second video views.",
  },
};

export const DEFAULT_REPORT_METRICS = [
  "impressions",
  "clicks",
  "spend",
  "conversions",
  "ctr",
  "cpc",
  "cpm",
] as const;

export const DATA_LEVEL_BY_DIMENSION: Record<ReportDimension, string> = {
  campaign: "AUCTION_CAMPAIGN",
  ad_group: "AUCTION_ADGROUP",
  ad: "AUCTION_AD",
};

export const ID_DIMENSION_BY_LEVEL: Record<ReportDimension, string> = {
  campaign: "campaign_id",
  ad_group: "adgroup_id",
  ad: "ad_id",
};

export function resolveMetrics(requested?: string[]): MetricDefinition[] {
  const names = requested && requested.length > 0 ? requested : [...DEFAULT_REPORT_METRICS];
  return names.map((name) => {
    const metric = REPORT_METRICS[name];
    if (!metric) {
      throw new TikTokValidationError(
        `TikTok does not support metric ${name} in this connector. Supported metrics: ${Object.keys(REPORT_METRICS).join(", ")}.`,
      );
    }
    return metric;
  });
}

export function dataLevelFor(dimension: ReportDimension): string {
  return DATA_LEVEL_BY_DIMENSION[dimension];
}

export function idDimensionFor(dimension: ReportDimension): string {
  return ID_DIMENSION_BY_LEVEL[dimension];
}
