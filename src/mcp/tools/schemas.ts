import { z } from "zod";

export const pageSchema = z.number().int().min(1).optional();
export const pageSizeSchema = z.number().int().min(1).max(1000).optional();

export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .describe("Calendar date in YYYY-MM-DD. Interpreted in the advertiser timezone.");

export const metricsSchema = z
  .array(z.string())
  .optional()
  .describe(
    "MCP metric names. Defaults to impressions, clicks, spend, conversions, ctr, cpc, cpm. Unsupported names return an error instead of zero.",
  );

export function jsonToolResult(data: unknown): { content: Array<{ type: "text"; text: string }> } {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}
