import { createTikTokMcpHandler } from "@/mcp/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const handler = createTikTokMcpHandler();

export const GET = handler;
export const POST = handler;
export const DELETE = handler;
export const OPTIONS = handler;
