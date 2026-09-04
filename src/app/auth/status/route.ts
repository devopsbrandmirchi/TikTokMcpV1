import { getConfig } from "@/config";
import { isTikTokConnected } from "@/tiktok/services/token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const config = getConfig();
  return Response.json({
    tiktok_connected: await isTikTokConnected(),
    advertiser_configured: Boolean(config.tiktokAdvertiserId),
  });
}
