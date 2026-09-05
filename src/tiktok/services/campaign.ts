import { getClassicOrSmartPlus } from "@/tiktok/client/classic-or-smart-plus";
import { pageHasMore, type TikTokPageInfo } from "@/tiktok/client/client";
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

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function normalizeCampaign(raw: Record<string, unknown>): TikTokCampaign {
  return {
    campaign_id: String(raw.campaign_id ?? ""),
    campaign_name: raw.campaign_name !== undefined ? String(raw.campaign_name) : undefined,
    status:
      raw.status !== undefined
        ? String(raw.status)
        : raw.secondary_status !== undefined
          ? String(raw.secondary_status)
          : undefined,
    operation_status: raw.operation_status !== undefined ? String(raw.operation_status) : undefined,
    objective_type: raw.objective_type !== undefined ? String(raw.objective_type) : undefined,
    budget: asNumber(raw.budget) ?? asNumber(raw.current_budget),
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
    const listQuery = {
      advertiser_id: advertiserId,
      page,
      page_size: pageSize,
      ...(Object.keys(filtering).length > 0 ? { filtering } : {}),
    };
    const { envelope, source } = await getClassicOrSmartPlus<ListData>({
      classicPath: "/campaign/get/",
      smartPlusPath: "/smart_plus/campaign/get/",
      classicQuery: { ...listQuery, fields: [...CAMPAIGN_FIELDS] },
      smartPlusQuery: listQuery,
    });

    const items = (envelope.data?.list ?? []).map(normalizeCampaign);
    const pageInfo = envelope.data?.page_info;
    return {
      advertiser_id: advertiserId,
      items,
      api_source: source,
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
