import type { MetricDefinition, ReportDimension } from "@/tiktok/reports/catalog";

const NAME_FIELDS: Record<ReportDimension, string> = {
  campaign: "campaign_name",
  ad_group: "adgroup_name",
  ad: "ad_name",
};

function asNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function asString(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  return String(value);
}

export function normalizeReportRow(
  raw: Record<string, unknown>,
  dimension: ReportDimension,
  metrics: MetricDefinition[],
): Record<string, unknown> {
  const metricsObject =
    raw.metrics && typeof raw.metrics === "object" ? (raw.metrics as Record<string, unknown>) : raw;
  const dimensionsObject =
    raw.dimensions && typeof raw.dimensions === "object"
      ? (raw.dimensions as Record<string, unknown>)
      : raw;

  const row: Record<string, unknown> = {};
  if (dimension === "campaign") {
    row.campaign_id = asString(dimensionsObject.campaign_id ?? raw.campaign_id);
    row.campaign_name = asString(metricsObject.campaign_name ?? raw.campaign_name);
  } else if (dimension === "ad_group") {
    row.adgroup_id = asString(dimensionsObject.adgroup_id ?? raw.adgroup_id);
    row.adgroup_name = asString(metricsObject.adgroup_name ?? raw.adgroup_name);
    row.campaign_id = asString(dimensionsObject.campaign_id ?? raw.campaign_id);
  } else {
    row.ad_id = asString(dimensionsObject.ad_id ?? raw.ad_id);
    row.ad_name = asString(metricsObject.ad_name ?? raw.ad_name);
    row.adgroup_id = asString(dimensionsObject.adgroup_id ?? raw.adgroup_id);
    row.campaign_id = asString(dimensionsObject.campaign_id ?? raw.campaign_id);
  }

  const day = asString(dimensionsObject.stat_time_day ?? raw.stat_time_day);
  if (day) {
    row.date = day;
  }

  for (const metric of metrics) {
    row[metric.mcpName] = asNumber(metricsObject[metric.tiktokField] ?? raw[metric.tiktokField]);
  }

  const nameField = NAME_FIELDS[dimension];
  if (row[nameField] === undefined) {
    delete row[nameField];
  }
  return row;
}
