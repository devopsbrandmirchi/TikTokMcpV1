export interface TikTokCampaign {
  campaign_id: string;
  campaign_name?: string;
  status?: string;
  operation_status?: string;
  objective_type?: string;
  budget?: number;
  budget_mode?: string;
  create_time?: string;
  modify_time?: string;
}

export const CAMPAIGN_FIELDS = [
  "campaign_id",
  "campaign_name",
  "status",
  "operation_status",
  "objective_type",
  "budget",
  "budget_mode",
  "create_time",
  "modify_time",
] as const;
