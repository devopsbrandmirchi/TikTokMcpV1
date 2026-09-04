import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { toToolErrorText } from "@/tiktok/errors";
import { adGroupService } from "@/tiktok/services/ad-group";
import { jsonToolResult, pageSchema, pageSizeSchema } from "@/mcp/tools/schemas";

export function registerAdGroupTools(server: McpServer): void {
  server.registerTool(
    "tiktok_list_ad_groups",
    {
      title: "List TikTok ad groups",
      description:
        "Lists ad groups for the configured TikTok advertiser. Optional campaign_id filters to one campaign. Optional status uses TikTok primary_status. Pagination: page and page_size. Returns budget, bid, optimization goal, and placement fields when TikTok provides them.",
      inputSchema: z.object({
        campaign_id: z.string().optional().describe("Limit results to this campaign."),
        status: z.string().optional(),
        page: pageSchema,
        page_size: pageSizeSchema,
      }),
    },
    async (input) => {
      try {
        return jsonToolResult(
          await adGroupService.listAdGroups({
            campaignId: input.campaign_id,
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
}
