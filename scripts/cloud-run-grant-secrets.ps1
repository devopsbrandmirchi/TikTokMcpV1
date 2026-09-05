param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectId,

  [string]$Region = "us-central1",
  [string]$Service = "tiktokmcpv1",
  [string]$SecretName = "tiktok-mcp-v1-tokens"
)

$ErrorActionPreference = "Stop"

gcloud config set project $ProjectId
gcloud services enable secretmanager.googleapis.com --project $ProjectId

$exists = gcloud secrets describe $SecretName --project $ProjectId 2>$null
if (-not $exists) {
  gcloud secrets create $SecretName `
    --project $ProjectId `
    --replication-policy=automatic
  Write-Host "Created secret $SecretName"
}

$serviceAccount = gcloud run services describe $Service `
  --project $ProjectId `
  --region $Region `
  --format "value(spec.template.spec.serviceAccountName)"
if (-not $serviceAccount) {
  $projectNumber = gcloud projects describe $ProjectId --format "value(projectNumber)"
  $serviceAccount = "$projectNumber-compute@developer.gserviceaccount.com"
}

Write-Host "Granting Secret Manager access to $serviceAccount"

foreach ($role in @("roles/secretmanager.secretAccessor", "roles/secretmanager.secretVersionManager")) {
  gcloud secrets add-iam-policy-binding $SecretName `
    --project $ProjectId `
    --member "serviceAccount:$serviceAccount" `
    --role $role
}

Write-Host "Done. Retry Claude.ai authorization. A new Cloud Run revision is not required for IAM changes."
