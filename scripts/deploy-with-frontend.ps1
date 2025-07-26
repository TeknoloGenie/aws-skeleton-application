# AWS Application Accelerator - Deploy with Frontend Configuration
# PowerShell Script

param(
    [string]$AppName = $env:APP_NAME,
    [string]$Stage = $env:STAGE,
    [string]$AwsRegion = $env:AWS_REGION
)

# Set default values
if (-not $AppName) { $AppName = "MyApp" }
if (-not $Stage) { $Stage = "dev" }
if (-not $AwsRegion) { $AwsRegion = "us-east-1" }

Write-Host "Starting AWS Application Accelerator deployment..." -ForegroundColor Green
Write-Host ""
Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "- App Name: $AppName" -ForegroundColor White
Write-Host "- Stage: $Stage" -ForegroundColor White
Write-Host "- AWS Region: $AwsRegion" -ForegroundColor White
Write-Host ""

# Function to check if command exists
function Test-Command($cmdname) {
    return [bool](Get-Command -Name $cmdname -ErrorAction SilentlyContinue)
}

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

if (-not (Test-Command "aws")) {
    Write-Host "ERROR: AWS CLI is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install AWS CLI and configure your credentials" -ForegroundColor Red
    exit 1
}

if (-not (Test-Command "cdk")) {
    Write-Host "ERROR: AWS CDK is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install CDK globally: npm install -g aws-cdk" -ForegroundColor Red
    exit 1
}

if (-not (Test-Command "npm")) {
    Write-Host "ERROR: npm is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js and npm" -ForegroundColor Red
    exit 1
}

Write-Host "Prerequisites check passed!" -ForegroundColor Green
Write-Host ""

try {
    # Install dependencies
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to install dependencies"
    }

    # Install frontend dependencies
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    npm run frontend:install
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to install frontend dependencies"
    }

    # Bootstrap CDK (if needed)
    Write-Host "Checking CDK bootstrap status..." -ForegroundColor Yellow
    cdk bootstrap --context appName=$AppName --context stage=$Stage
    if ($LASTEXITCODE -ne 0) {
        throw "CDK bootstrap failed"
    }

    # Deploy the CDK stack
    Write-Host "Deploying CDK stack..." -ForegroundColor Yellow
    cdk deploy "$AppName-$Stage" --context appName=$AppName --context stage=$Stage --require-approval never
    if ($LASTEXITCODE -ne 0) {
        throw "CDK deployment failed"
    }

    # Success message
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Deployment completed successfully!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Start the frontend development server:" -ForegroundColor White
    Write-Host "   cd frontend" -ForegroundColor Cyan
    Write-Host "   npm run dev" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "2. Access your application:" -ForegroundColor White
    Write-Host "   - Frontend: http://localhost:3000" -ForegroundColor Cyan
    Write-Host "   - Check CDK outputs for GraphQL API endpoint" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "3. The aws-exports.js file has been generated automatically" -ForegroundColor White
    Write-Host "   in the frontend/src directory" -ForegroundColor Cyan
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Deployment failed!" -ForegroundColor Red
    exit 1
}
