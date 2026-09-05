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

$secretName = "tiktok-mcp-v1-tokens"
$secretExists = gcloud secrets describe $secretName --project $ProjectId 2>$null
if (-not $secretExists) {
  gcloud secrets create $secretName --project $ProjectId --replication-policy=automatic
}

$projectNumber = gcloud projects describe $ProjectId --format "value(projectNumber)"
$runtimeSa = "$projectNumber-compute@developer.gserviceaccount.com"
foreach ($role in @("roles/secretmanager.secretAccessor", "roles/secretmanager.secretVersionManager")) {
  gcloud secrets add-iam-policy-binding $secretName `
    --project $ProjectId `
    --member "serviceAccount:$runtimeSa" `
    --role $role
}

Write-Host "Enabled Cloud Run, Artifact Registry, Cloud Build, and Secret Manager."
Write-Host "Created $secretName and granted $runtimeSa Secret Manager access."
Write-Host "Also create secrets for TIKTOK_APP_SECRET, MCP_TOKEN_SECRET, OAUTH_STATE_SECRET, and TOKEN_ENCRYPTION_KEY."
