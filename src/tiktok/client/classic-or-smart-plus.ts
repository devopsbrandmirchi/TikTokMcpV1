import { logger } from "@/security/logger";
import { tiktokApiClient, type TikTokApiEnvelope } from "@/tiktok/client/client";
import { TikTokPermissionError } from "@/tiktok/errors";

export type TikTokEntityApiSource = "classic" | "smart_plus";

export async function getClassicOrSmartPlus<T>(params: {
  classicPath: string;
  smartPlusPath: string;
  classicQuery: Record<string, unknown>;
  smartPlusQuery?: Record<string, unknown>;
}): Promise<{ envelope: TikTokApiEnvelope<T>; source: TikTokEntityApiSource }> {
  try {
    const envelope = await tiktokApiClient.get<T>(params.classicPath, params.classicQuery);
    return { envelope, source: "classic" };
  } catch (error) {
    if (!(error instanceof TikTokPermissionError)) {
      throw error;
    }
    logger.info("TikTok classic entity endpoint denied; retrying Smart+", {
      classicPath: params.classicPath,
      smartPlusPath: params.smartPlusPath,
    });
    const envelope = await tiktokApiClient.get<T>(
      params.smartPlusPath,
      params.smartPlusQuery ?? params.classicQuery,
    );
    return { envelope, source: "smart_plus" };
  }
}
