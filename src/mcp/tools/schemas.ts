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
    "MCP metric names. Defaults to impressions, clicks, spend, conversions, ctr, cpc, cpm. Also available: conversion_rate, reach, frequency, video_play_actions, video_watched_2s, video_watched_6s, total_purchase_value, cost_per_conversion, total_active_pay_roas. Unsupported names return an error instead of zero.",
  );

export function jsonToolResult(data: unknown): { content: Array<{ type: "text"; text: string }> } {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}
