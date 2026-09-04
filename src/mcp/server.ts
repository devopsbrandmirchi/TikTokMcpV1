import { createMcpHandler } from "mcp-handler";
import { wwwAuthenticateHeader } from "@/auth/mcp/metadata";
import { APP_VERSION } from "@/config";
import { extractMcpToken, tryReadAccessToken } from "@/mcp/auth";
import {
  mcpOptionsResponse,
  mcpProbeGetResponse,
  toJsonRpcResponse,
  withCors,
  withStreamableAccept,
} from "@/mcp/http";
import { registerAdGroupTools } from "@/mcp/tools/ad-groups";
import { registerAdTools } from "@/mcp/tools/ads";
import { registerAdvertiserTools } from "@/mcp/tools/advertiser";
import { registerCampaignTools } from "@/mcp/tools/campaigns";
import { registerReportTools } from "@/mcp/tools/reports";
import { logger } from "@/security/logger";
import { createRequestId, runWithRequest } from "@/utils/request-id";

export function unauthorizedMcpResponse(): Response {
  return withCors(
    new Response(
      JSON.stringify({
        error: "invalid_token",
        error_description: "Authentication required",
      }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
          "WWW-Authenticate": wwwAuthenticateHeader(),
        },
      },
    ),
  );
}

function createInnerHandler() {
  return createMcpHandler(
    (server) => {
      registerAdvertiserTools(server);
      registerCampaignTools(server);
      registerAdGroupTools(server);
      registerAdTools(server);
      registerReportTools(server);
    },
    {
      serverInfo: {
        name: "tiktok-mcp-v1",
        version: APP_VERSION,
      },
      instructions:
        "This is a standalone TikTok Ads MCP connector for one configured advertiser (TIKTOK_ADVERTISER_ID). Do not ask which advertiser to use. Use tiktok_get_advertiser for account metadata, tiktok_list_campaigns / tiktok_get_campaign / tiktok_list_ad_groups / tiktok_list_ads for entity reads, and tiktok_campaign_report / tiktok_ad_group_report / tiktok_ad_report for performance. Dates are YYYY-MM-DD in the advertiser timezone. Set group_by_day=true for daily rows. V1 is read-only. Never invent metrics; if TikTok does not support a metric, the tool returns an error.",
      onEvent: (event) => {
        if (event.type === "ERROR") {
          logger.error("MCP handler error", {
            source: event.source,
            severity: event.severity,
            context: event.context,
          });
        }
      },
    },
  );
}

function toolNameFromBody(body: unknown): string | undefined {
  const messages = Array.isArray(body) ? body : [body];
  for (const message of messages) {
    if (message && typeof message === "object") {
      const params = (message as { params?: { name?: unknown } }).params;
      if (typeof params?.name === "string") {
        return params.name;
      }
    }
  }
  return undefined;
}

export function createTikTokMcpHandler() {
  const handler = createInnerHandler();

  return async (req: Request): Promise<Response> => {
    const requestId = createRequestId(req);
    const started = Date.now();

    if (req.method === "OPTIONS") {
      return mcpOptionsResponse();
    }

    let body: unknown;
    if (req.method === "POST") {
      try {
        body = await req.clone().json();
      } catch {
        body = undefined;
      }
    }
    const mcpOperation = toolNameFromBody(body) ?? req.method.toLowerCase();

    const token = extractMcpToken(req);
    const payload = tryReadAccessToken(token);
    if (!payload?.sub) {
      logger.warn("Unauthorized MCP request", { requestId, mcpOperation, success: false });
      return unauthorizedMcpResponse();
    }

    if (req.method === "GET") {
      return mcpProbeGetResponse();
    }
    if (req.method === "DELETE") {
      return new Response(null, { status: 204 });
    }

    return runWithRequest({ requestId }, async () => {
      try {
        const response = await toJsonRpcResponse(await handler(withStreamableAccept(req)));
        logger.info("MCP request", {
          requestId,
          mcpOperation,
          success: response.ok,
          durationMs: Date.now() - started,
        });
        return response;
      } catch (error) {
        logger.error("MCP request failed", {
          requestId,
          mcpOperation,
          success: false,
          errorCategory: error instanceof Error ? error.name : "unknown",
          durationMs: Date.now() - started,
        });
        throw error;
      }
    });
  };
}
