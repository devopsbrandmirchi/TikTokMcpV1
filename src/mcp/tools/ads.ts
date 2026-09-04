import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { toToolErrorText } from "@/tiktok/errors";
import { adService } from "@/tiktok/services/ad";
import { jsonToolResult, pageSchema, pageSizeSchema } from "@/mcp/tools/schemas";

export function registerAdTools(server: McpServer): void {
  server.registerTool(
    "tiktok_list_ads",
    {
      title: "List TikTok ads",
      description:
        "Lists ads for the configured TikTok advertiser. Optional campaign_id and adgroup_id filters. Optional status uses TikTok primary_status. Pagination: page and page_size. Use this for questions like 'show the ads under campaign 123'.",
      inputSchema: z.object({
        campaign_id: z.string().optional(),
        adgroup_id: z.string().optional(),
        status: z.string().optional(),
        page: pageSchema,
        page_size: pageSizeSchema,
      }),
    },
    async (input) => {
      try {
        return jsonToolResult(
          await adService.listAds({
            campaignId: input.campaign_id,
            adGroupId: input.adgroup_id,
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
