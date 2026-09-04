import { logger } from "@/security/logger";
import { disconnectTikTok } from "@/tiktok/services/token";
import { escapeHtml, htmlResponse, pageHtml } from "@/utils/html";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await disconnectTikTok();
    logger.info("TikTok connection revoked");
    return htmlResponse(
      pageHtml(
        "TikTok disconnected",
        "<h1>TikTok disconnected</h1><p>The stored Marketing API authorization was revoked where supported and removed from this server. Reconnect from Claude.ai to authorize again.</p>",
      ),
    );
  } catch (error) {
    return htmlResponse(
      pageHtml(
        "Disconnect failed",
        `<h1>Disconnect failed</h1><p class="error">${escapeHtml(
          error instanceof Error ? error.message : "Could not disconnect",
        )}</p>`,
      ),
      500,
    );
  }
}
