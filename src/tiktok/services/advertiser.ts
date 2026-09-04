import { pageHasMore, tiktokApiClient, type TikTokPageInfo } from "@/tiktok/client/client";
import { ADVERTISER_FIELDS, type TikTokAdvertiser } from "@/tiktok/models/advertiser";
import { TikTokNotFoundError } from "@/tiktok/errors";
import { resolveAdvertiserId } from "@/tiktok/services/token";

interface AdvertiserInfoData {
  list?: Array<Record<string, unknown>>;
  page_info?: TikTokPageInfo;
}

function normalizeAdvertiser(raw: Record<string, unknown>, fallbackId: string): TikTokAdvertiser {
  return {
    advertiser_id: String(raw.advertiser_id ?? raw.id ?? fallbackId),
    advertiser_name: raw.name !== undefined ? String(raw.name) : undefined,
    status: raw.status !== undefined ? String(raw.status) : undefined,
    currency: raw.currency !== undefined ? String(raw.currency) : undefined,
    timezone: raw.timezone !== undefined ? String(raw.timezone) : undefined,
    display_timezone: raw.display_timezone !== undefined ? String(raw.display_timezone) : undefined,
    country: raw.country !== undefined ? String(raw.country) : undefined,
    company: raw.company !== undefined ? String(raw.company) : undefined,
    create_time: raw.create_time !== undefined ? String(raw.create_time) : undefined,
    balance: typeof raw.balance === "number" ? raw.balance : undefined,
  };
}

export class AdvertiserService {
  async getAdvertiser(advertiserId?: string): Promise<TikTokAdvertiser> {
    const id = resolveAdvertiserId(advertiserId);
    const response = await tiktokApiClient.get<AdvertiserInfoData>("/advertiser/info/", {
      advertiser_ids: [id],
      fields: [...ADVERTISER_FIELDS],
    });
    const first = response.data?.list?.[0];
    if (!first) {
      throw new TikTokNotFoundError(`TikTok did not return advertiser ${id}.`);
    }
    return normalizeAdvertiser(first, id);
  }
}

export const advertiserService = new AdvertiserService();

export { pageHasMore };
