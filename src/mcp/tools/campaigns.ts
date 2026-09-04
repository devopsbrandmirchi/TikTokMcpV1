import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { toToolErrorText } from "@/tiktok/errors";
import { campaignService } from "@/tiktok/services/campaign";
import { jsonToolResult, pageSchema, pageSizeSchema } from "@/mcp/tools/schemas";

export function registerCampaignTools(server: McpServer): void {
  server.registerTool(
    "tiktok_list_campaigns",
    {
      title: "List TikTok campaigns",
      description:
        "Lists campaigns for the configured TikTok advertiser. Optional status uses TikTok primary_status values such as STATUS_DELIVERY_OK, STATUS_DISABLE, or STATUS_DELETE. Pagination uses page (default 1) and page_size (default 20, max 1000). The response includes has_more. Use this for 'list campaigns' or 'show active campaigns'.",
      inputSchema: z.object({
        status: z.string().optional().describe("TikTok primary_status filter, if provided."),
        page: pageSchema,
        page_size: pageSizeSchema,
      }),
    },
    async (input) => {
      try {
        return jsonToolResult(
          await campaignService.listCampaigns({
            status: input.status,
            page: input.page,
            pageSize: input.page_size,
          }),
        );
      } catch (error) {
        return { content: [{ type: "text", text: toToolErrorText(error) }], isError: true };
      }
    },
  );

  server.registerTool(
    "tiktok_get_campaign",
    {
      title: "Get TikTok campaign",
      description:
        "Returns one campaign by campaign_id using TikTok GET /campaign/get/ with filtering.campaign_ids. Required: campaign_id. Returns a not-found error if TikTok does not include that campaign for the configured advertiser.",
      inputSchema: z.object({
        campaign_id: z.string().min(1).describe("TikTok campaign ID."),
      }),
    },
    async (input) => {
      try {
        return jsonToolResult(await campaignService.getCampaign(input.campaign_id));
      } catch (error) {
        return { content: [{ type: "text", text: toToolErrorText(error) }], isError: true };
      }
    },
  );
}
