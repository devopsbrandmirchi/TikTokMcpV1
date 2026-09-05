import { getClassicOrSmartPlus } from "@/tiktok/client/classic-or-smart-plus";
import { pageHasMore, type TikTokPageInfo } from "@/tiktok/client/client";
import { AD_GROUP_FIELDS, type TikTokAdGroup } from "@/tiktok/models/ad-group";
import type { NormalizedListResponse } from "@/tiktok/models/common";
import { resolveAdvertiserId } from "@/tiktok/services/token";

interface ListData {
  list?: Array<Record<string, unknown>>;
  page_info?: TikTokPageInfo;
}

export interface ListAdGroupsInput {
  advertiserId?: string;
  campaignId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

function normalizeAdGroup(raw: Record<string, unknown>): TikTokAdGroup {
  return {
    adgroup_id: String(raw.adgroup_id ?? raw.smart_plus_adgroup_id ?? ""),
    adgroup_name: raw.adgroup_name !== undefined ? String(raw.adgroup_name) : undefined,
    campaign_id: raw.campaign_id !== undefined ? String(raw.campaign_id) : undefined,
    status:
      raw.status !== undefined
        ? String(raw.status)
        : raw.secondary_status !== undefined
          ? String(raw.secondary_status)
          : undefined,
    operation_status: raw.operation_status !== undefined ? String(raw.operation_status) : undefined,
    budget: typeof raw.budget === "number" ? raw.budget : undefined,
    budget_mode: raw.budget_mode !== undefined ? String(raw.budget_mode) : undefined,
    bid_price: typeof raw.bid_price === "number" ? raw.bid_price : undefined,
    bid_type: raw.bid_type !== undefined ? String(raw.bid_type) : undefined,
    optimization_goal: raw.optimization_goal !== undefined ? String(raw.optimization_goal) : undefined,
    placement_type: raw.placement_type !== undefined ? String(raw.placement_type) : undefined,
    placements: raw.placements,
    create_time: raw.create_time !== undefined ? String(raw.create_time) : undefined,
    modify_time: raw.modify_time !== undefined ? String(raw.modify_time) : undefined,
  };
}

export class AdGroupService {
  async listAdGroups(input: ListAdGroupsInput = {}): Promise<NormalizedListResponse<TikTokAdGroup>> {
    const advertiserId = resolveAdvertiserId(input.advertiserId);
    const filtering: Record<string, unknown> = {};
    if (input.status) {
      filtering.primary_status = input.status;
    }
    if (input.campaignId) {
      filtering.campaign_ids = [input.campaignId];
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
      classicPath: "/adgroup/get/",
      smartPlusPath: "/smart_plus/adgroup/get/",
      classicQuery: { ...listQuery, fields: [...AD_GROUP_FIELDS] },
      smartPlusQuery: listQuery,
    });

    const pageInfo = envelope.data?.page_info;
    return {
      advertiser_id: advertiserId,
      items: (envelope.data?.list ?? []).map(normalizeAdGroup),
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
}

export const adGroupService = new AdGroupService();
