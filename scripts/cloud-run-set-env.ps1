param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectId,

  [Parameter(Mandatory = $true)]
  [string]$AppBaseUrl,

  [string]$Region = "us-central1",
  [string]$Service = "tiktok-mcp-v1"
)

$ErrorActionPreference = "Stop"

$origin = $AppBaseUrl.TrimEnd("/")

gcloud run services update $Service `
  --project $ProjectId `
  --region $Region `
  --update-env-vars "APP_BASE_URL=$origin,TIKTOK_REDIRECT_URI=$origin/oauth/tiktok/callback,GOOGLE_CLOUD_PROJECT=$ProjectId,TIKTOK_TOKEN_SECRET_NAME=tiktok-mcp-v1-tokens,NODE_ENV=production"

Write-Host "Updated APP_BASE_URL and TikTok redirect on $Service."
Write-Host "Set remaining secrets (TIKTOK_APP_ID, TIKTOK_APP_SECRET, TIKTOK_ADVERTISER_ID, MCP_TOKEN_SECRET, OAUTH_STATE_SECRET, TOKEN_ENCRYPTION_KEY) with gcloud run services update --update-secrets or --set-env-vars."
