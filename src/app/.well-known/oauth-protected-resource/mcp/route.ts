import { corsJson, corsOptions, protectedResourceMetadata } from "@/auth/mcp/metadata";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return corsOptions();
}

export function GET() {
  return corsJson(protectedResourceMetadata());
}
