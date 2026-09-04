import { describe, expect, it } from "vitest";
import { resolveMetrics } from "@/tiktok/reports/catalog";
import { MAX_REPORT_RANGE_DAYS, validateDateRange } from "@/tiktok/reports/dates";
import { TikTokValidationError } from "@/tiktok/errors";

describe("date and metric validation", () => {
  it("accepts a valid inclusive range", () => {
    expect(validateDateRange("2026-08-01", "2026-08-31")).toEqual({
      start: "2026-08-01",
      end: "2026-08-31",
    });
  });

  it("rejects invalid format, calendar dates, reversed ranges, and oversized ranges", () => {
    expect(() => validateDateRange("08/01/2026", "2026-08-31")).toThrow(TikTokValidationError);
    expect(() => validateDateRange("2026-02-30", "2026-03-01")).toThrow(TikTokValidationError);
    expect(() => validateDateRange("2026-08-31", "2026-08-01")).toThrow(TikTokValidationError);
    expect(() => validateDateRange("2024-01-01", "2026-01-02")).toThrow(/at most/);
    expect(MAX_REPORT_RANGE_DAYS).toBe(365);
  });

  it("maps conversions to TikTok conversion and rejects unknown metrics", () => {
    const metrics = resolveMetrics(["spend", "conversions"]);
    expect(metrics.map((m) => m.tiktokField)).toEqual(["spend", "conversion"]);
    expect(() => resolveMetrics(["made_up_metric"])).toThrow(/does not support metric made_up_metric/);
  });
});
