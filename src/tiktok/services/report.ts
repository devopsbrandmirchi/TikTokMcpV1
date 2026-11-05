import { pageHasMore, tiktokApiClient, type TikTokPageInfo } from "@/tiktok/client/client";
import { TikTokReportError, TikTokValidationError } from "@/tiktok/errors";
import { logger } from "@/security/logger";
import {
  NAME_METRIC_BY_DIMENSION,
  dataLevelFor,
  idDimensionFor,
  resolveMetrics,
  type ReportDimension,
} from "@/tiktok/reports/catalog";
import { validateDateRange } from "@/tiktok/reports/dates";
import { normalizeReportRow } from "@/tiktok/reports/normalize";
import { advertiserService } from "@/tiktok/services/advertiser";
import { campaignService } from "@/tiktok/services/campaign";
import { resolveAdvertiserId } from "@/tiktok/services/token";

export interface ReportRequest {
  dimension: ReportDimension;
  startDate: string;
  endDate: string;
  metrics?: string[];
  filters?: {
    campaignIds?: string[];
    adGroupIds?: string[];
    adIds?: string[];
  };
  page?: number;
  pageSize?: number;
  groupByDay?: boolean;
  advertiserId?: string;
}

export interface ReportResponse {
  advertiser_id: string;
  date_range: { start: string; end: string };
  dimension: ReportDimension;
  currency?: string;
  timezone?: string;
  rows: Array<Record<string, unknown>>;
  pagination: {
    page: number;
    page_size: number;
    total_number?: number;
    total_page?: number;
    has_more: boolean;
  };
  partial: boolean;
  mode: "synchronous" | "asynchronous";
  data_notes: string[];
}

interface SyncReportData {
  list?: Array<Record<string, unknown>>;
  page_info?: TikTokPageInfo;
}

interface TaskCreateData {
  task_id?: string;
}

interface TaskCheckData {
  status?: string;
  message?: string;
}

const REPORT_DATA_NOTES = [
  "Report dates are interpreted in the advertiser account timezone, not the server timezone.",
  "TikTok conversions use TikTok attribution windows and are not equivalent to Google Ads or Microsoft Advertising conversions.",
  "Recent days may still change as TikTok finalizes delivery and conversion data.",
  "spend is in the advertiser currency. This connector does not convert currencies.",
];

const SIZE_ERROR_PATTERN = /10000|too many|exceed|CHUNK|async/i;
const ASYNC_POLL_MS = 1500;
const ASYNC_MAX_ATTEMPTS = 20;

function buildFiltering(filters?: ReportRequest["filters"]): Array<Record<string, unknown>> | undefined {
  if (!filters) {
    return undefined;
  }
  const filtering: Array<Record<string, unknown>> = [];
  if (filters.campaignIds?.length) {
    filtering.push({ field_name: "campaign_ids", filter_type: "IN", filter_value: JSON.stringify(filters.campaignIds) });
  }
  if (filters.adGroupIds?.length) {
    filtering.push({ field_name: "adgroup_ids", filter_type: "IN", filter_value: JSON.stringify(filters.adGroupIds) });
  }
  if (filters.adIds?.length) {
    filtering.push({ field_name: "ad_ids", filter_type: "IN", filter_value: JSON.stringify(filters.adIds) });
  }
  return filtering.length > 0 ? filtering : undefined;
}

function reportQuery(request: ReportRequest, metrics: string[], dimensions: string[]) {
  const advertiserId = resolveAdvertiserId(request.advertiserId);
  return {
    advertiser_id: advertiserId,
    report_type: "BASIC",
    service_type: "AUCTION",
    data_level: dataLevelFor(request.dimension),
    dimensions,
    metrics,
    start_date: request.startDate,
    end_date: request.endDate,
    page: request.page ?? 1,
    page_size: request.pageSize ?? 100,
    ...(buildFiltering(request.filters) ? { filtering: buildFiltering(request.filters) } : {}),
  };
}

function isSizeError(error: unknown): boolean {
  return error instanceof Error && SIZE_ERROR_PATTERN.test(error.message);
}

async function runAsyncReport(
  request: ReportRequest,
  metrics: string[],
  dimensions: string[],
): Promise<SyncReportData> {
  const created = await tiktokApiClient.post<TaskCreateData>("/report/task/create/", {
    ...reportQuery(request, metrics, dimensions),
    page: undefined,
    page_size: undefined,
  });
  const taskId = created.data?.task_id;
  if (!taskId) {
    throw new TikTokReportError("TikTok did not return a report task_id for the asynchronous report.");
  }

  for (let attempt = 0; attempt < ASYNC_MAX_ATTEMPTS; attempt += 1) {
    const check = await tiktokApiClient.get<TaskCheckData>("/report/task/check/", { task_id: taskId });
    const status = (check.data?.status ?? "").toUpperCase();
    if (status === "SUCCESS" || status === "COMPLETED" || status === "DONE") {
      const download = await tiktokApiClient.get<SyncReportData>("/report/task/download/", { task_id: taskId });
      return download.data ?? {};
    }
    if (status === "FAILED" || status === "ERROR") {
      throw new TikTokReportError(
        check.data?.message || "TikTok asynchronous report failed. Try a smaller date range or fewer IDs.",
      );
    }
    await new Promise((resolve) => setTimeout(resolve, ASYNC_POLL_MS));
  }
  throw new TikTokReportError("TikTok asynchronous report timed out before completion. The result is not complete.");
}

const NAME_LOOKUP_CHUNK = 100;

/**
 * Best-effort name fill for campaign rows TikTok returned without a name. Never fails the report.
 * Campaigns the app cannot read through the entity endpoints stay ID-only.
 */
async function fillMissingNames(
  rows: Array<Record<string, unknown>>,
  request: ReportRequest,
): Promise<void> {
  if (request.dimension !== "campaign") {
    return;
  }
  const missing = [
    ...new Set(
      rows
        .filter((row) => row.campaign_name === undefined && typeof row.campaign_id === "string")
        .map((row) => row.campaign_id as string),
    ),
  ];
  if (missing.length === 0) {
    return;
  }
  const names = new Map<string, string>();
  try {
    for (let i = 0; i < missing.length; i += NAME_LOOKUP_CHUNK) {
      const result = await campaignService.listCampaigns({
        advertiserId: request.advertiserId,
        campaignIds: missing.slice(i, i + NAME_LOOKUP_CHUNK),
        pageSize: NAME_LOOKUP_CHUNK,
      });
      for (const item of result.items) {
        if (item.campaign_name) {
          names.set(item.campaign_id, item.campaign_name);
        }
      }
    }
  } catch (error) {
    logger.warn("Could not fill campaign names from the campaign list", {
      message: error instanceof Error ? error.message : String(error),
    });
  }
  for (const row of rows) {
    const name = typeof row.campaign_id === "string" ? names.get(row.campaign_id) : undefined;
    if (row.campaign_name === undefined && name) {
      row.campaign_name = name;
    }
  }
}

export class ReportService {
  async run(request: ReportRequest): Promise<ReportResponse> {
    const dateRange = validateDateRange(request.startDate, request.endDate);
    const metricDefs = resolveMetrics(request.metrics);
    const dataMetrics = [...new Set(metricDefs.map((metric) => metric.tiktokField))];
    const nameMetric = NAME_METRIC_BY_DIMENSION[request.dimension];
    const dimensions = [idDimensionFor(request.dimension)];
    if (request.groupByDay) {
      dimensions.push("stat_time_day");
    }

    const advertiser = await advertiserService.getAdvertiser(request.advertiserId);

    let data: SyncReportData = {};
    let mode: ReportResponse["mode"] = "synchronous";
    let partial = false;

    // Ask TikTok for the entity name alongside the data. If TikTok rejects the name metric for
    // this account or level, retry without it and fill names from the entity list afterwards.
    const fetchReport = async (tiktokMetrics: string[]): Promise<SyncReportData> => {
      try {
        const sync = await tiktokApiClient.get<SyncReportData>(
          "/report/integrated/get/",
          reportQuery(request, tiktokMetrics, dimensions),
        );
        return sync.data ?? {};
      } catch (error) {
        if (!isSizeError(error)) {
          throw error;
        }
        mode = "asynchronous";
        return runAsyncReport(request, tiktokMetrics, dimensions);
      }
    };

    try {
      data = await fetchReport([...dataMetrics, nameMetric]);
    } catch (error) {
      if (!(error instanceof TikTokValidationError) || isSizeError(error)) {
        throw error;
      }
      logger.warn("TikTok report rejected the name metric; retrying without it", {
        dimension: request.dimension,
      });
      data = await fetchReport(dataMetrics);
    }

    const rows = (data.list ?? []).map((row) =>
      normalizeReportRow(row, request.dimension, metricDefs),
    );
    await fillMissingNames(rows, request);
    const pageInfo = data.page_info;
    const hasMore = mode === "synchronous" ? pageHasMore(pageInfo) : false;
    if (hasMore) {
      partial = true;
    }

    return {
      advertiser_id: advertiser.advertiser_id,
      date_range: dateRange,
      dimension: request.dimension,
      currency: advertiser.currency,
      timezone: advertiser.timezone ?? advertiser.display_timezone,
      rows,
      pagination: {
        page: pageInfo?.page ?? request.page ?? 1,
        page_size: pageInfo?.page_size ?? request.pageSize ?? 100,
        total_number: pageInfo?.total_number,
        total_page: pageInfo?.total_page,
        has_more: hasMore,
      },
      partial,
      mode,
      data_notes: REPORT_DATA_NOTES,
    };
  }
}

export const reportService = new ReportService();
