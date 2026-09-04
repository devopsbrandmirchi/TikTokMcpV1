import { pageHasMore, tiktokApiClient, type TikTokPageInfo } from "@/tiktok/client/client";
import { AD_FIELDS, type TikTokAd } from "@/tiktok/models/ad";
import type { NormalizedListResponse } from "@/tiktok/models/common";
import { resolveAdvertiserId } from "@/tiktok/services/token";

interface ListData {
  list?: Array<Record<string, unknown>>;
  page_info?: TikTokPageInfo;
}

export interface ListAdsInput {
  advertiserId?: string;
  campaignId?: string;
  adGroupId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

function normalizeAd(raw: Record<string, unknown>): TikTokAd {
  return {
    ad_id: String(raw.ad_id ?? ""),
    ad_name: raw.ad_name !== undefined ? String(raw.ad_name) : undefined,
    adgroup_id: raw.adgroup_id !== undefined ? String(raw.adgroup_id) : undefined,
    campaign_id: raw.campaign_id !== undefined ? String(raw.campaign_id) : undefined,
    status: raw.status !== undefined ? String(raw.status) : undefined,
    operation_status: raw.operation_status !== undefined ? String(raw.operation_status) : undefined,
    landing_page_url: raw.landing_page_url !== undefined ? String(raw.landing_page_url) : undefined,
    ad_format: raw.ad_format !== undefined ? String(raw.ad_format) : undefined,
    ad_text: raw.ad_text !== undefined ? String(raw.ad_text) : undefined,
    create_time: raw.create_time !== undefined ? String(raw.create_time) : undefined,
    modify_time: raw.modify_time !== undefined ? String(raw.modify_time) : undefined,
  };
}

export class AdService {
  async listAds(input: ListAdsInput = {}): Promise<NormalizedListResponse<TikTokAd>> {
    const advertiserId = resolveAdvertiserId(input.advertiserId);
    const filtering: Record<string, unknown> = {};
    if (input.status) {
      filtering.primary_status = input.status;
    }
    if (input.campaignId) {
      filtering.campaign_ids = [input.campaignId];
    }
    if (input.adGroupId) {
      filtering.adgroup_ids = [input.adGroupId];
    }

    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 20;
    const response = await tiktokApiClient.get<ListData>("/ad/get/", {
      advertiser_id: advertiserId,
      fields: [...AD_FIELDS],
      page,
      page_size: pageSize,
      ...(Object.keys(filtering).length > 0 ? { filtering } : {}),
    });

    const pageInfo = response.data?.page_info;
    return {
      advertiser_id: advertiserId,
      items: (response.data?.list ?? []).map(normalizeAd),
      pagination: {
        page: pageInfo?.page ?? page,
        page_size: pageInfo?.page_size ?? pageSize,
        total_number: pageInfo?.total_number,
        total_page: pageInfo?.total_page,
        has_more: pageHasMore(pageInfo),
      },
    };
  }
}

export const adService = new AdService();
