param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectId,

  [string]$Region = "us-central1",
  [string]$Service = "tiktok-mcp-v1",
  [string]$Repository = "tiktok-mcp-v1"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

gcloud config set project $ProjectId

$commitSha = "local-" + (Get-Date -Format "yyyyMMddHHmmss")
if (Test-Path (Join-Path $root ".git")) {
  $gitSha = (git -C $root rev-parse HEAD).Trim()
  if ($gitSha) {
    $commitSha = $gitSha
  }
}

Write-Host "Submitting Cloud Build for tiktok-mcp-v1"
gcloud builds submit $root `
  --project $ProjectId `
  --config "$root\cloudbuild.yaml" `
  --substitutions "_REGION=$Region,_SERVICE=$Service,_REPOSITORY=$Repository,COMMIT_SHA=$commitSha"
if ($LASTEXITCODE -ne 0) {
  throw "Cloud Build failed."
}

$serviceUrl = gcloud run services describe $Service `
  --region $Region `
  --project $ProjectId `
  --format "value(status.url)"

Write-Host ""
Write-Host "Cloud Run URL: $serviceUrl"
Write-Host "MCP endpoint:  $serviceUrl/mcp"
Write-Host "Health:        $serviceUrl/health"
Write-Host "TikTok callback: $serviceUrl/oauth/tiktok/callback"
Write-Host ""
Write-Host "Set APP_BASE_URL to $serviceUrl (no trailing slash), add the callback URI in the TikTok developer portal, then run cloud-run-set-env.ps1"
