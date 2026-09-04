import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { toToolErrorText } from "@/tiktok/errors";
import { advertiserService } from "@/tiktok/services/advertiser";
import { jsonToolResult } from "@/mcp/tools/schemas";

export function registerAdvertiserTools(server: McpServer): void {
  server.registerTool(
    "tiktok_get_advertiser",
    {
      title: "Get TikTok advertiser",
      description:
        "Returns information about the single TikTok advertiser configured for this connector (TIKTOK_ADVERTISER_ID). Use this when the user asks for account name, status, currency, timezone, or country. No advertiser_id argument is required in V1. Does not return tokens or secrets.",
      inputSchema: z.object({}),
    },
    async () => {
      try {
        const advertiser = await advertiserService.getAdvertiser();
        return jsonToolResult(advertiser);
      } catch (error) {
        return { content: [{ type: "text", text: toToolErrorText(error) }], isError: true };
      }
    },
  );
}
