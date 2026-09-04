# TikTok API mapping

Authority: [TikTok API for Business](https://business-api.tiktok.com/portal/docs) and the official [tiktok-business-api-sdk](https://github.com/tiktok/tiktok-business-api-sdk).

Implemented API version: **v1.3**.

| Item | Value |
|------|--------|
| Base URL | `https://business-api.tiktok.com/open_api/v1.3` |
| Auth header | `Access-Token: {access_token}` |
| Success | JSON `code === 0` |
| Pagination | `page`, `page_size` (1–1000); `data.page_info` |
| Complex GET params | JSON-encoded (`filtering`, `fields`, `dimensions`, `metrics`) |

## OAuth

| Step | Method | URL |
|------|--------|-----|
| Advertiser authorization | GET | `https://business-api.tiktok.com/portal/auth?app_id&redirect_uri&state` |
| Exchange `auth_code` | POST | `/oauth2/access_token/` body `{ app_id, secret, auth_code, grant_type }` |
| Refresh | POST | `/oauth2/refresh_token/` when TikTok returns a refresh token |
| Revoke | POST | `/oauth2/revoke_token/` |
| Authorized advertisers | GET | `/oauth2/advertiser/get/` |

Official SDK notes: some app types return an access token (~24h) plus refresh token (~1 year). Some Marketing API long-lived tokens do not expire until revoked. This connector stores whatever TikTok returns and refreshes when a refresh token exists.

TikTok Marketing API advertiser authorization does not document PKCE. MCP OAuth uses PKCE. TikTok OAuth uses signed `state` only.

## Read endpoints

| Resource | Method | Path | Notes |
|----------|--------|------|-------|
| Advertiser | GET | `/advertiser/info/` | `advertiser_ids` JSON array |
| Campaigns | GET | `/campaign/get/` | `filtering.campaign_ids`, `primary_status` |
| Ad groups | GET | `/adgroup/get/` | `filtering.campaign_ids` |
| Ads | GET | `/ad/get/` | `filtering.campaign_ids`, `adgroup_ids` |

## Reporting

| Mode | Method | Path |
|------|--------|------|
| Synchronous BASIC | GET | `/report/integrated/get/` |
| Async create | POST | `/report/task/create/` |
| Async check | GET | `/report/task/check/` |
| Async download | GET | `/report/task/download/` |

V1 uses `report_type=BASIC`, `service_type=AUCTION`.

| MCP tool | `data_level` | ID dimension |
|----------|--------------|--------------|
| `tiktok_campaign_report` | `AUCTION_CAMPAIGN` | `campaign_id` |
| `tiktok_ad_group_report` | `AUCTION_ADGROUP` | `adgroup_id` |
| `tiktok_ad_report` | `AUCTION_AD` | `ad_id` |

`group_by_day=true` adds `stat_time_day`. Dates are advertiser-timezone calendar dates. Official sync reports are intended for up to about 10,000 ads; larger results fall back to async tasks.

## Timezone and latency

- `start_date` / `end_date` are interpreted in the advertiser timezone from `/advertiser/info/` (`timezone` / `display_timezone`).
- This connector never converts those dates to UTC.
- TikTok delivery metrics are near real time; conversions can lag and recent days can still change.

## Rate limits and errors

Bounded retry (max 3) on HTTP 429, transient 5xx, timeouts, and connection errors, with exponential backoff and `Retry-After`. TikTok `code` values are mapped to typed errors (`TikTokAuthenticationError`, `TikTokRateLimitError`, and others).

## Permissions

The TikTok developer app must request Marketing API read access for advertiser information, campaigns, ad groups, ads, and reporting. Advertisers must authorize the app. TikTok may require app review before production access is granted.

## Not used

Campaign create/update/delete, creative upload, audience APIs, Events API, Login Kit, Commercial Content API, and TikTok’s hosted MCP server.
