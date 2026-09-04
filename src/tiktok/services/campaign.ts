import { pageHasMore, tiktokApiClient, type TikTokPageInfo } from "@/tiktok/client/client";
import type { NormalizedListResponse } from "@/tiktok/models/common";
import { CAMPAIGN_FIELDS, type TikTokCampaign } from "@/tiktok/models/campaign";
import { TikTokNotFoundError } from "@/tiktok/errors";
import { resolveAdvertiserId } from "@/tiktok/services/token";

interface ListData {
  list?: Array<Record<string, unknown>>;
  page_info?: TikTokPageInfo;
}

export interface ListCampaignsInput {
  advertiserId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
  campaignIds?: string[];
}

function normalizeCampaign(raw: Record<string, unknown>): TikTokCampaign {
  return {
    campaign_id: String(raw.campaign_id ?? ""),
    campaign_name: raw.campaign_name !== undefined ? String(raw.campaign_name) : undefined,
    status: raw.status !== undefined ? String(raw.status) : undefined,
    operation_status: raw.operation_status !== undefined ? String(raw.operation_status) : undefined,
    objective_type: raw.objective_type !== undefined ? String(raw.objective_type) : undefined,
    budget: typeof raw.budget === "number" ? raw.budget : undefined,
    budget_mode: raw.budget_mode !== undefined ? String(raw.budget_mode) : undefined,
    create_time: raw.create_time !== undefined ? String(raw.create_time) : undefined,
    modify_time: raw.modify_time !== undefined ? String(raw.modify_time) : undefined,
  };
}

export class CampaignService {
  async listCampaigns(input: ListCampaignsInput = {}): Promise<NormalizedListResponse<TikTokCampaign>> {
    const advertiserId = resolveAdvertiserId(input.advertiserId);
    const filtering: Record<string, unknown> = {};
    if (input.status) {
      filtering.primary_status = input.status;
    }
    if (input.campaignIds?.length) {
      filtering.campaign_ids = input.campaignIds;
    }

    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 20;
    const response = await tiktokApiClient.get<ListData>("/campaign/get/", {
      advertiser_id: advertiserId,
      fields: [...CAMPAIGN_FIELDS],
      page,
      page_size: pageSize,
      ...(Object.keys(filtering).length > 0 ? { filtering } : {}),
    });

    const items = (response.data?.list ?? []).map(normalizeCampaign);
    const pageInfo = response.data?.page_info;
    return {
      advertiser_id: advertiserId,
      items,
      pagination: {
        page: pageInfo?.page ?? page,
        page_size: pageInfo?.page_size ?? pageSize,
        total_number: pageInfo?.total_number,
        total_page: pageInfo?.total_page,
        has_more: pageHasMore(pageInfo),
      },
    };
  }

  async getCampaign(campaignId: string, advertiserId?: string): Promise<TikTokCampaign> {
    const result = await this.listCampaigns({
      advertiserId,
      campaignIds: [campaignId],
      page: 1,
      pageSize: 1,
    });
    const campaign = result.items[0];
    if (!campaign) {
      throw new TikTokNotFoundError(`TikTok did not return campaign ${campaignId} for the configured advertiser.`);
    }
    return campaign;
  }
}

export const campaignService = new CampaignService();
