# Metrics

All listed metrics are **supplied by TikTok**. This connector does not calculate them.

| MCP Metric | TikTok Field | Source/Calculation | Notes |
|------------|--------------|--------------------|-------|
| impressions | `impressions` | TikTok | Times ads were shown |
| clicks | `clicks` | TikTok | Clicks |
| spend | `spend` | TikTok | Advertiser currency. No FX conversion |
| conversions | `conversion` | TikTok | TikTok attribution. Not comparable to Google Ads or Microsoft Advertising |
| ctr | `ctr` | TikTok | Click-through rate from TikTok |
| cpc | `cpc` | TikTok | Cost per click from TikTok |
| cpm | `cpm` | TikTok | Cost per thousand impressions from TikTok |
| conversion_rate | `conversion_rate` | TikTok | TikTok conversion rate |
| reach | `reach` | TikTok | Unique users reached |
| frequency | `frequency` | TikTok | Average impressions per reached user |
| video_play_actions | `video_play_actions` | TikTok | Video plays |
| video_watched_2s | `video_watched_2s` | TikTok | 2-second views |
| video_watched_6s | `video_watched_6s` | TikTok | 6-second views |

Unsupported metric names return an error. They are not replaced with `0` and are not silently dropped.

## Currency

`currency` comes from `/advertiser/info/`. Report `spend` is in that currency.

## Attribution

TikTok conversion windows and event definitions are platform-specific. Do not treat `conversions` as equal to Google Ads conversions or Microsoft Advertising conversions.

## Latency

Recent days, especially conversion metrics, may still change after the report is pulled. `data_notes` on every report states this.
