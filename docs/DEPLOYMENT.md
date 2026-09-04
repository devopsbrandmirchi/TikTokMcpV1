# Deployment

## Local

```powershell
copy .env.example .env
# fill required values
npm install
npm run dev
```

Health: `http://localhost:3000/health`  
MCP: `http://localhost:3000/mcp`  
TikTok redirect: `http://localhost:3000/oauth/tiktok/callback`

## Docker

```powershell
docker compose up --build
```

The image listens on port 8080 as a non-root user. Persist local tokens with the `tiktok-tokens` volume or set Secret Manager variables.

## Cloud Run

1. Create a GCP project and enable Cloud Run, Artifact Registry, Cloud Build, and Secret Manager.
2. Create secrets for `TIKTOK_APP_SECRET`, `MCP_TOKEN_SECRET`, `OAUTH_STATE_SECRET`, and `TOKEN_ENCRYPTION_KEY`.
3. Build and deploy:

```powershell
.\scripts\cloud-run-deploy.ps1
```

4. After the first URL exists, set `APP_BASE_URL` to that origin (no trailing slash) and register the TikTok redirect URI:

```
{APP_BASE_URL}/oauth/tiktok/callback
```

5. Set `TIKTOK_TOKEN_SECRET_NAME` (for example `tiktok-mcp-v1-tokens`) and `GOOGLE_CLOUD_PROJECT` so rotated refresh tokens survive revisions.
6. Cloud Run ingress must allow unauthenticated requests. Claude is not a GCP IAM identity. MCP JWTs authorize `/mcp`.

Recommended service flags:

- `--allow-unauthenticated`
- `--port=8080`
- `--memory=1Gi`
- `--timeout=300`
- `--cpu=1`

## Environment variables

See [`.env.example`](../.env.example). Never commit `.env`.

## Claude.ai

Add a Custom Connector whose URL is `{APP_BASE_URL}/mcp`. See the README for the full connect sequence.
