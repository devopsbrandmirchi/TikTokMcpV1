param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectId,

  [string]$Region = "us-central1",
  [string]$Repository = "tiktok-mcp-v1"
)

$ErrorActionPreference = "Stop"

gcloud config set project $ProjectId
gcloud services enable `
  run.googleapis.com `
  artifactregistry.googleapis.com `
  cloudbuild.googleapis.com `
  secretmanager.googleapis.com `
  --project $ProjectId

$exists = gcloud artifacts repositories describe $Repository --location $Region --project $ProjectId 2>$null
if (-not $exists) {
  gcloud artifacts repositories create $Repository `
    --repository-format=docker `
    --location $Region `
    --project $ProjectId `
    --description "TikTokMcpV1 container images"
}

Write-Host "Enabled Cloud Run, Artifact Registry, Cloud Build, and Secret Manager."
Write-Host "Create secrets for TIKTOK_APP_SECRET, MCP_TOKEN_SECRET, OAUTH_STATE_SECRET, and TOKEN_ENCRYPTION_KEY."
Write-Host "Create an empty secret named tiktok-mcp-v1-tokens for encrypted TikTok refresh tokens."
