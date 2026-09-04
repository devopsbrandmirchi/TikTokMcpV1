# MCP tools

All tools use the single configured advertiser (`TIKTOK_ADVERTISER_ID`). Claude does not pass `advertiser_id`.

## tiktok_get_advertiser

Purpose: Account metadata for the configured advertiser.

Parameters: none.

Example: “Show me my TikTok advertiser account.”

Response: `advertiser_id`, `advertiser_name`, `status`, `currency`, `timezone`, `country`, and other fields TikTok returns.

## tiktok_list_campaigns

Purpose: List campaigns.

Parameters: `status` (TikTok `primary_status`), `page`, `page_size`.

Example: “List all TikTok campaigns.” / “Show active campaigns.”

Response: Normalized campaign rows plus `pagination.has_more`.

## tiktok_get_campaign

Purpose: One campaign via `/campaign/get/` filtered by `campaign_ids`.

Parameters: `campaign_id` (required).

Example: “Get campaign 111.”

## tiktok_list_ad_groups

Purpose: List ad groups.

Parameters: `campaign_id`, `status`, `page`, `page_size`.

Example: “Show ad groups under campaign 111.”

## tiktok_list_ads

Purpose: List ads.

Parameters: `campaign_id`, `adgroup_id`, `status`, `page`, `page_size`.

Example: “Show the ads under campaign 123.”

## tiktok_campaign_report

Purpose: Campaign-level BASIC performance.

Parameters: `start_date`, `end_date` (YYYY-MM-DD, required), `metrics`, `campaign_ids`, `page`, `page_size`, `group_by_day`.

Example: “Show campaign performance from 2026-08-01 through 2026-08-31.”

Response: Normalized rows, advertiser `currency`, `timezone`, `pagination.has_more`, `partial`, `data_notes`.

## tiktok_ad_group_report

Purpose: Ad-group-level BASIC performance.

Parameters: same as campaign report plus `adgroup_ids`.

Example: “Show ad group performance from August 1 through August 31.”

## tiktok_ad_report

Purpose: Ad-level BASIC performance.

Parameters: same as ad group report plus `ad_ids`.

Example: “Show ad-level performance for the last 7 days.”

## Daily reports

There is no separate daily tool. Set `group_by_day=true` on any report tool to add `stat_time_day`.

## Common errors

- TikTok is not connected or the token was revoked.
- The authorized advertisers do not include `TIKTOK_ADVERTISER_ID`.
- Invalid dates or an unsupported metric name.
- Rate limit (retry with a smaller page or range).
- Permission or not-found errors from TikTok.
