# TikTokMcpV1

Production Claude.ai Custom Connector for **one** TikTok advertising account.

This repository is independent of:

- Google All-in-One MCP (Analytics / Ads / DV360)
- BingMcpV1 (Microsoft Advertising)

Do not combine those products with this one.

## 1. Overview

TikTokMcpV1 exposes read and reporting access to a single TikTok advertiser through the official Marketing API **v1.3**. It is a Next.js / TypeScript MCP server designed for Claude.ai Custom Connectors.

V1 does not create, update, or delete campaigns, ad groups, ads, creatives, or audiences.

## 2. Architecture

```
Claude.ai
  → MCP OAuth 2.1 (PKCE, DCR, CIMD)
TikTokMcpV1
  → TikTok OAuth (Business Portal advertiser authorization)
TikTok Marketing API v1.3
  → TIKTOK_ADVERTISER_ID
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## 3. MCP architecture

Claude talks to `{APP_BASE_URL}/mcp` using Streamable HTTP. Unauthorized calls receive `401` plus `WWW-Authenticate` pointing at protected-resource metadata.

## 4. MCP OAuth

This server is the MCP authorization server:

| Endpoint | Role |
|----------|------|
| `/.well-known/oauth-authorization-server` | AS metadata |
| `/.well-known/oauth-protected-resource/mcp` | Resource metadata |
| `/oauth/mcp/authorize` | Authorization code + PKCE S256 |
| `/oauth/mcp/token` | Code and refresh-token exchange |
| `/oauth/mcp/register` | Stateless Dynamic Client Registration |

CIMD is supported when `client_id` is an `https://` document URL. Claude.ai / Claude.com callback URLs are allow-listed.

MCP tokens are HS256 JWTs. They are not TikTok API tokens.

## 5. TikTok OAuth

If TikTok is not connected, MCP authorize redirects to:

`https://business-api.tiktok.com/portal/auth`

The callback at `/oauth/tiktok/callback` exchanges `auth_code` for a Marketing API token. State is signed and stored in an encrypted HTTP-only cookie. TikTok advertiser auth does not document PKCE; this connector does not invent TikTok PKCE.

Disconnect: `GET /oauth/tiktok/disconnect` (revokes when supported and clears stored tokens).

## 6. TikTok Marketing API

- Version: **v1.3**
- Base: `https://business-api.tiktok.com/open_api/v1.3`
- Header: `Access-Token`
- Reads: `/advertiser/info/`, `/campaign/get/`, `/adgroup/get/`, `/ad/get/`
- Reports: `/report/integrated/get/` (async fallback via `/report/task/*`)

See [docs/TIKTOK_API_MAPPING.md](docs/TIKTOK_API_MAPPING.md).

## 7. One-account V1 model

One deployment, one TikTok OAuth connection, one `TIKTOK_ADVERTISER_ID`. Claude is not asked which advertiser to use. Service interfaces still accept an optional advertiser ID for a future V2.

## 8. Setup

```powershell
copy .env.example .env
npm install
```

Fill every required variable in `.env`. Never commit `.env`.

## 9. Environment variables

Required:

- `APP_BASE_URL`
- `TIKTOK_APP_ID`
- `TIKTOK_APP_SECRET`
- `TIKTOK_ADVERTISER_ID`
- `MCP_TOKEN_SECRET`
- `OAUTH_STATE_SECRET`
- `TOKEN_ENCRYPTION_KEY`

Optional: `TIKTOK_REDIRECT_URI`, `TIKTOK_TOKEN_STORE_PATH`, `GOOGLE_CLOUD_PROJECT`, `TIKTOK_TOKEN_SECRET_NAME`, `MCP_OAUTH_CLIENT_ID`, `MCP_OAUTH_CLIENT_SECRET`, `TIKTOK_LIVE_TEST`.

## 10. TikTok developer configuration

1. Create a developer account at the [TikTok API for Business portal](https://business-api.tiktok.com/portal).
2. Create an app and enable **Marketing API** access.
3. Request read permissions for advertiser info, campaigns, ad groups, ads, and reporting.
4. Add redirect URI `{APP_BASE_URL}/oauth/tiktok/callback` (localhost is allowed for development; TikTok limits how many redirect URLs you can register).
5. Copy App ID and App Secret into `TIKTOK_APP_ID` / `TIKTOK_APP_SECRET`.
6. Set `TIKTOK_ADVERTISER_ID` to the Ads Manager advertiser you will authorize.
7. App review / approval may be required before production access works. Access is not automatic.

## 11. Local development

```powershell
npm run dev
```

- Health: http://localhost:3000/health
- MCP: http://localhost:3000/mcp
- Auth status: http://localhost:3000/auth/status

Encrypted TikTok tokens are written to `.data/tiktok-tokens.enc` (gitignored).

## 12. Testing

```powershell
npm test
npm run typecheck
npm run lint
```

Unit tests use mocked TikTok fixtures. Live tests run only when `TIKTOK_LIVE_TEST=true` and credentials are present.

## 13. Docker

```powershell
docker compose up --build
```

Image: Node 20, standalone Next.js, non-root user, port 8080, `/health` check.

## 14. Cloud Run

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

```powershell
.\scripts\cloud-run-setup.ps1 -ProjectId YOUR_PROJECT
.\scripts\cloud-run-deploy.ps1 -ProjectId YOUR_PROJECT
.\scripts\cloud-run-set-env.ps1 -ProjectId YOUR_PROJECT -AppBaseUrl https://YOUR-SERVICE.run.app
```

Use Secret Manager for rotated TikTok tokens (`TIKTOK_TOKEN_SECRET_NAME`). Allow unauthenticated ingress; MCP JWTs authorize the connector.

## 15. Claude.ai Custom Connector setup

1. Deploy TikTokMcpV1 and set `APP_BASE_URL`.
2. Register `{APP_BASE_URL}/oauth/tiktok/callback` in the TikTok developer app.
3. In Claude.ai → Settings → Connectors → Add custom connector.
4. URL: `{APP_BASE_URL}/mcp`
5. Claude discovers OAuth metadata, registers (DCR) or uses CIMD, and opens `/oauth/mcp/authorize`.
6. If TikTok is not connected, the browser authorizes the advertiser on TikTok.
7. The server stores encrypted TikTok tokens and redirects Claude with an MCP authorization code.
8. Claude exchanges the code (PKCE) for MCP access/refresh tokens.
9. Claude calls `/mcp` with `Authorization: Bearer <MCP access token>`.
10. Tools query the configured advertiser. TikTok tokens never appear in tool results.

## 16. MCP tools

| Tool | Purpose |
|------|---------|
| `tiktok_get_advertiser` | Account metadata |
| `tiktok_list_campaigns` | Campaign list |
| `tiktok_get_campaign` | One campaign |
| `tiktok_list_ad_groups` | Ad groups |
| `tiktok_list_ads` | Ads |
| `tiktok_campaign_report` | Campaign performance |
| `tiktok_ad_group_report` | Ad group performance |
| `tiktok_ad_report` | Ad performance |

Details: [docs/MCP_TOOLS.md](docs/MCP_TOOLS.md). Metrics: [docs/METRICS.md](docs/METRICS.md).

## 17. Reporting examples

- Show TikTok campaign performance from 2026-08-01 through 2026-08-31.
- Show TikTok spend and conversions by campaign for August 2026.
- Show daily TikTok spend for the last 7 days (`group_by_day=true`).
- Which TikTok campaign had the highest spend in August 2026?
- Show impressions, clicks, spend, CTR, CPC, and CPM by campaign.

Dates are `YYYY-MM-DD` in the **advertiser timezone**. They are not rewritten to UTC.

## 18. Troubleshooting

| Symptom | What to check |
|---------|----------------|
| 401 on `/mcp` | MCP token missing/expired; reconnect the Custom Connector |
| TikTok auth error | Re-run Claude connect; confirm the advertiser granted the app |
| Advertiser mismatch | `TIKTOK_ADVERTISER_ID` must be in the authorized `advertiser_ids` |
| Rate limit | Wait and retry; shrink `page_size` or the date range |
| Partial report | `has_more` / `partial` is true — request the next page |
| Tokens lost after Cloud Run deploy | Configure Secret Manager; local files do not survive revisions |
| `secretmanager.versions.access` / cannot write tokens | Create `tiktok-mcp-v1-tokens` first, then grant the Cloud Run runtime service account `secretAccessor` and `secretVersionManager`. Run `.\scripts\cloud-run-grant-secrets.ps1`. Those roles cannot create the secret at runtime. |

## 19. API limitations

- Read/reporting only.
- One advertiser per deployment.
- Sync BASIC reports have TikTok size limits; large queries use async tasks.
- TikTok conversions are not Google Ads or Bing conversions.
- Recent metrics can still change.
- Smart+ entities may use additional TikTok endpoints not exposed in V1.
- TikTok app review may block production tokens until approved.

## Ads Manager validation

Compare a fixed range (for example 2026-08-01 to 2026-08-31) in Ads Manager vs `tiktok_campaign_report`:

- campaign count
- impressions, clicks, spend, conversions, CTR, CPC, CPM

Expected differences: reporting latency, attribution windows, advertiser timezone vs your laptop timezone, currency (no conversion here), filters (deleted/status), and metric definitions.

## Security

- No secrets in Git.
- Logs redact tokens, secrets, authorization codes, cookies, and JWTs.
- MCP tools never return TikTok or MCP secrets.
- OAuth state, redirect URI, and PKCE are validated.
- Production assumes HTTPS (`APP_BASE_URL` and `Secure` cookies behind `x-forwarded-proto`).
