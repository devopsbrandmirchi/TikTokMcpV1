import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { toToolErrorText } from "@/tiktok/errors";
import { reportService } from "@/tiktok/services/report";
import { dateSchema, jsonToolResult, metricsSchema, pageSchema, pageSizeSchema } from "@/mcp/tools/schemas";

const sharedReportFields = {
  start_date: dateSchema.describe("Inclusive start date YYYY-MM-DD in the advertiser timezone."),
  end_date: dateSchema.describe("Inclusive end date YYYY-MM-DD in the advertiser timezone."),
  metrics: metricsSchema,
  campaign_ids: z.array(z.string()).optional(),
  page: pageSchema,
  page_size: pageSizeSchema,
  group_by_day: z
    .boolean()
    .optional()
    .describe("If true, adds TikTok dimension stat_time_day for daily rows. Use this for daily spend questions."),
};

export function registerReportTools(server: McpServer): void {
  server.registerTool(
    "tiktok_campaign_report",
    {
      title: "TikTok campaign performance report",
      description:
        "Returns campaign-level BASIC performance from TikTok GET /report/integrated/get/ (data_level AUCTION_CAMPAIGN). Required: start_date and end_date as YYYY-MM-DD. Optional metrics default to impressions, clicks, spend, conversions, ctr, cpc, cpm. Optional campaign_ids filter. Set group_by_day=true for daily rows. Dates are not converted to UTC. has_more=true means this page is incomplete. TikTok conversions are not comparable to Google Ads or Bing conversions. Currency comes from the advertiser account.",
      inputSchema: z.object(sharedReportFields),
    },
    async (input) => {
      try {
        return jsonToolResult(
          await reportService.run({
            dimension: "campaign",
            startDate: input.start_date,
            endDate: input.end_date,
            metrics: input.metrics,
            filters: { campaignIds: input.campaign_ids },
            page: input.page,
            pageSize: input.page_size,
            groupByDay: input.group_by_day,
          }),
        );
      } catch (error) {
        return { content: [{ type: "text", text: toToolErrorText(error) }], isError: true };
      }
    },
  );

  server.registerTool(
    "tiktok_ad_group_report",
    {
      title: "TikTok ad group performance report",
      description:
        "Returns ad-group-level BASIC performance (data_level AUCTION_ADGROUP). Required: start_date, end_date (YYYY-MM-DD). Optional metrics, campaign_ids, adgroup_ids, group_by_day, page, page_size. Use for 'ad group performance from August 1 through August 31'.",
      inputSchema: z.object({
        ...sharedReportFields,
        adgroup_ids: z.array(z.string()).optional(),
      }),
    },
    async (input) => {
      try {
        return jsonToolResult(
          await reportService.run({
            dimension: "ad_group",
            startDate: input.start_date,
            endDate: input.end_date,
            metrics: input.metrics,
            filters: { campaignIds: input.campaign_ids, adGroupIds: input.adgroup_ids },
            page: input.page,
            pageSize: input.page_size,
            groupByDay: input.group_by_day,
          }),
        );
      } catch (error) {
        return { content: [{ type: "text", text: toToolErrorText(error) }], isError: true };
      }
    },
  );

  server.registerTool(
    "tiktok_ad_report",
    {
      title: "TikTok ad performance report",
      description:
        "Returns ad-level BASIC performance (data_level AUCTION_AD). Required: start_date, end_date (YYYY-MM-DD). Optional metrics, campaign_ids, adgroup_ids, ad_ids, group_by_day, page, page_size. Use for 'ad-level performance for the last 7 days'.",
      inputSchema: z.object({
        ...sharedReportFields,
        adgroup_ids: z.array(z.string()).optional(),
        ad_ids: z.array(z.string()).optional(),
      }),
    },
    async (input) => {
      try {
        return jsonToolResult(
          await reportService.run({
            dimension: "ad",
            startDate: input.start_date,
            endDate: input.end_date,
            metrics: input.metrics,
            filters: {
              campaignIds: input.campaign_ids,
              adGroupIds: input.adgroup_ids,
              adIds: input.ad_ids,
            },
            page: input.page,
            pageSize: input.page_size,
            groupByDay: input.group_by_day,
          }),
        );
      } catch (error) {
        return { content: [{ type: "text", text: toToolErrorText(error) }], isError: true };
      }
    },
  );
}
