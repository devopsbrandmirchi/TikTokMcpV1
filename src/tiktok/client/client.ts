import { getConfig } from "@/config";
import { logger } from "@/security/logger";
import { getRequestId } from "@/utils/request-id";
import {
  mapTikTokError,
  TikTokApiError,
  TikTokAuthenticationError,
} from "@/tiktok/errors";
import { getTikTokAccessToken, refreshAndStoreTikTokToken } from "@/tiktok/services/token";

export interface TikTokPageInfo {
  page: number;
  page_size: number;
  total_number: number;
  total_page: number;
}

export interface TikTokApiEnvelope<T> {
  code: number;
  message?: string;
  request_id?: string;
  data?: T;
}

export interface TikTokRequestOptions {
  path: string;
  method?: "GET" | "POST";
  query?: Record<string, unknown>;
  body?: unknown;
  accessToken?: string;
  timeoutMs?: number;
  retryOnAuthFailure?: boolean;
}

const MAX_RETRIES = 3;
const DEFAULT_TIMEOUT_MS = 30_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function encodeQuery(query?: Record<string, unknown>): string {
  if (!query) {
    return "";
  }
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) {
      continue;
    }
    if (typeof value === "object") {
      params.set(key, JSON.stringify(value));
    } else {
      params.set(key, String(value));
    }
  }
  const encoded = params.toString();
  return encoded ? `?${encoded}` : "";
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return undefined;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw mapTikTokError({
      httpStatus: response.status,
      message: "TikTok returned a malformed JSON response.",
    });
  }
}

function retryAfterMs(response: Response, attempt: number): number {
  const header = response.headers.get("retry-after");
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return seconds * 1000;
    }
  }
  return Math.min(1000 * 2 ** attempt, 8000);
}

export class TikTokApiClient {
  async request<T>(options: TikTokRequestOptions): Promise<TikTokApiEnvelope<T>> {
    const config = getConfig();
    const method = options.method ?? "GET";
    const url = `${config.tiktokApiBaseUrl}${options.path}${encodeQuery(options.query)}`;
    let accessToken = options.accessToken ?? (await getTikTokAccessToken());
    let retriedAuth = false;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      const started = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

      try {
        const response = await fetch(url, {
          method,
          headers: {
            "Access-Token": accessToken,
            "Content-Type": "application/json",
          },
          body: method === "POST" && options.body !== undefined ? JSON.stringify(options.body) : undefined,
          signal: controller.signal,
        });

        const json = (await parseJson(response)) as TikTokApiEnvelope<T> | undefined;
        const durationMs = Date.now() - started;
        logger.info("TikTok API request", {
          requestId: getRequestId(),
          operation: method,
          endpoint: options.path,
          status: response.status,
          tiktokCode: json?.code,
          durationMs,
          advertiserId: typeof options.query?.advertiser_id === "string" ? options.query.advertiser_id : undefined,
        });

        const mappedHttpError = !response.ok
          ? mapTikTokError({
              httpStatus: response.status,
              tiktokCode: json?.code,
              message: json?.message,
              requestId: json?.request_id,
            })
          : undefined;

        if (
          mappedHttpError instanceof TikTokAuthenticationError &&
          options.retryOnAuthFailure !== false &&
          !retriedAuth
        ) {
          retriedAuth = true;
          accessToken = await refreshAndStoreTikTokToken();
          attempt -= 1;
          continue;
        }

        const transient = response.status === 429 || response.status >= 500;
        if (transient && attempt < MAX_RETRIES) {
          await sleep(retryAfterMs(response, attempt));
          continue;
        }

        if (mappedHttpError) {
          throw mappedHttpError;
        }

        if (!json || typeof json !== "object") {
          throw mapTikTokError({
            httpStatus: response.status,
            message: "TikTok returned an empty response.",
          });
        }

        if (json.code !== 0) {
          const mapped = mapTikTokError({
            httpStatus: response.status,
            tiktokCode: json.code,
            message: json.message,
            requestId: json.request_id,
          });
          if (
            mapped instanceof TikTokAuthenticationError &&
            options.retryOnAuthFailure !== false &&
            !retriedAuth
          ) {
            retriedAuth = true;
            accessToken = await refreshAndStoreTikTokToken();
            attempt -= 1;
            continue;
          }
          throw mapped;
        }

        return json;
      } catch (error) {
        if (error instanceof TikTokApiError) {
          throw error;
        }
        const aborted = error instanceof Error && error.name === "AbortError";
        const network = error instanceof Error && /fetch|network|ECONN|ETIMEDOUT/i.test(error.message);
        if ((aborted || network) && attempt < MAX_RETRIES) {
          await sleep(retryAfterMs(new Response(null, { status: 503 }), attempt));
          continue;
        }
        if (aborted) {
          throw new TikTokApiError("TikTok Marketing API request timed out.", { status: 504 });
        }
        throw error;
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new TikTokApiError("TikTok Marketing API request failed after retries.");
  }

  get<T>(path: string, query?: Record<string, unknown>): Promise<TikTokApiEnvelope<T>> {
    return this.request<T>({ path, method: "GET", query });
  }

  post<T>(path: string, body?: unknown, query?: Record<string, unknown>): Promise<TikTokApiEnvelope<T>> {
    return this.request<T>({ path, method: "POST", body, query });
  }
}

export const tiktokApiClient = new TikTokApiClient();

export function pageHasMore(pageInfo?: TikTokPageInfo): boolean {
  if (!pageInfo) {
    return false;
  }
  return pageInfo.page < pageInfo.total_page;
}
