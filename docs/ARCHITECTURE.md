# Architecture

TikTokMcpV1 is a standalone Claude.ai Custom Connector. It is not part of the Google All-in-One MCP or BingMcpV1 products.

```
Claude.ai
    ↓  MCP OAuth 2.1 (PKCE, DCR, CIMD)
TikTokMcpV1
    ↓  TikTok OAuth (Marketing API advertiser authorization)
TikTok Marketing API v1.3
    ↓
ONE advertiser (TIKTOK_ADVERTISER_ID)
```

## Two authentication layers

### Layer 1 — MCP OAuth 2.1 (Claude ↔ this server)

Claude discovers this connector at `{APP_BASE_URL}/mcp`. A 401 includes `WWW-Authenticate` pointing at `/.well-known/oauth-protected-resource/mcp`.

The server is its own authorization server:

- `/.well-known/oauth-authorization-server`
- `/oauth/mcp/authorize` — authorization code + PKCE S256
- `/oauth/mcp/token` — `authorization_code` and `refresh_token`
- `/oauth/mcp/register` — Dynamic Client Registration

MCP access, refresh, and authorization-code tokens are stateless HS256 JWTs signed with `MCP_TOKEN_SECRET`. JWT `sub` is the instance identity `tiktok-mcp-v1`. There is no operator table and no Firestore.

Claude never receives TikTok tokens.

### Layer 2 — TikTok OAuth (this server ↔ TikTok)

If TikTok is not yet connected, MCP authorize redirects the browser to the official Business Portal authorization URL. The callback exchanges `auth_code` for a Marketing API access token (and refresh token when TikTok returns one).

TikTok tokens are encrypted with AES-256-GCM (`TOKEN_ENCRYPTION_KEY`) and stored:

- tests: in-memory
- local: encrypted file (`TIKTOK_TOKEN_STORE_PATH`)
- Cloud Run: Secret Manager when `GOOGLE_CLOUD_PROJECT` and `TIKTOK_TOKEN_SECRET_NAME` are set

TikTok API calls use the `Access-Token` header. They never use the MCP Bearer token.

## One-account V1 model

One deployment owns one TikTok OAuth connection and one advertiser ID from `TIKTOK_ADVERTISER_ID`. MCP tools do not accept `advertiser_id`. Service methods still accept an optional advertiser ID internally so V2 can add selection later.

## Runtime

Next.js 15 App Router, Node 20, TypeScript strict, Streamable HTTP MCP via `mcp-handler`. Docker standalone output on Cloud Run port 8080 with unauthenticated ingress (Claude is not a GCP IAM principal). MCP JWTs are the authorization boundary.

## What this is not

- Not TikTok’s hosted Business MCP (`open_mcp/tt-ads-mcp-layer`)
- Not Login Kit, organic video APIs, Events API, or Commercial Content API
- Not a campaign dashboard
- Not a multi-advertiser platform
