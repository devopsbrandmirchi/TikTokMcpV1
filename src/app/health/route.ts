import { APP_NAME, APP_VERSION } from "@/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    status: "ok",
    service: APP_NAME,
    version: APP_VERSION,
  });
}
