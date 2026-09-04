import { TikTokValidationError } from "@/tiktok/errors";

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
export const MAX_REPORT_RANGE_DAYS = 365;

export function parseIsoDate(value: string, field: string): Date {
  const match = DATE_RE.exec(value);
  if (!match) {
    throw new TikTokValidationError(`${field} must be a calendar date in YYYY-MM-DD format.`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new TikTokValidationError(`${field} is not a valid calendar date.`);
  }
  return date;
}

export function validateDateRange(startDate: string, endDate: string): { start: string; end: string } {
  const start = parseIsoDate(startDate, "start_date");
  const end = parseIsoDate(endDate, "end_date");
  if (start.getTime() > end.getTime()) {
    throw new TikTokValidationError("start_date must be on or before end_date.");
  }
  const days = (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000) + 1;
  if (days > MAX_REPORT_RANGE_DAYS) {
    throw new TikTokValidationError(
      `The requested date range is ${days} days. TikTokMcpV1 allows at most ${MAX_REPORT_RANGE_DAYS} days so reports stay within Marketing API basic-report limits.`,
    );
  }
  return { start: startDate, end: endDate };
}
