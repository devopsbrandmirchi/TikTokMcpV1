export interface TikTokAdGroup {
  adgroup_id: string;
  adgroup_name?: string;
  campaign_id?: string;
  status?: string;
  operation_status?: string;
  budget?: number;
  budget_mode?: string;
  bid_price?: number;
  bid_type?: string;
  optimization_goal?: string;
  placement_type?: string;
  placements?: unknown;
  create_time?: string;
  modify_time?: string;
}

export const AD_GROUP_FIELDS = [
  "adgroup_id",
  "adgroup_name",
  "campaign_id",
  "status",
  "operation_status",
  "budget",
  "budget_mode",
  "bid_price",
  "bid_type",
  "optimization_goal",
  "placement_type",
  "placements",
  "create_time",
  "modify_time",
] as const;
