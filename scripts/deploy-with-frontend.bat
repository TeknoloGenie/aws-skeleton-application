@echo off
REM AWS Application Accelerator - Deploy with Frontend Configuration
REM Windows Batch Script

echo Starting AWS Application Accelerator deployment...

REM Set default values if not provided
if "%APP_NAME%"=="" set APP_NAME=MyApp
if "%STAGE%"=="" set STAGE=dev
if "%AWS_REGION%"=="" set AWS_REGION=us-east-1

echo.
echo Configuration:
echo - App Name: %APP_NAME%
echo - Stage: %STAGE%
echo - AWS Region: %AWS_REGION%
echo.

REM Check if AWS CLI is available
aws --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: AWS CLI is not installed or not in PATH
    echo Please install AWS CLI and configure your credentials
    exit /b 1
)

REM Check if CDK is available
cdk --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: AWS CDK is not installed or not in PATH
    echo Please install CDK globally: npm install -g aws-cdk
    exit /b 1
)

REM Install dependencies
echo Installing dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    exit /b 1
)

REM Build application and layers
echo Building application and layers...
call npm run build
if errorlevel 1 (
    echo ERROR: Failed to build application and layers
    exit /b 1
)

REM Install frontend dependencies
echo Installing frontend dependencies...
call npm run frontend:install
if errorlevel 1 (
    echo ERROR: Failed to install frontend dependencies
    exit /b 1
)

REM Bootstrap CDK (if needed)
echo Checking CDK bootstrap status...
cdk bootstrap --context appName=%APP_NAME% --context stage=%STAGE%
if errorlevel 1 (
    echo ERROR: CDK bootstrap failed
    exit /b 1
)

REM Deploy the CDK stack
echo Deploying CDK stack...
cdk deploy %APP_NAME%-%STAGE% --context appName=%APP_NAME% --context stage=%STAGE% --require-approval never
if errorlevel 1 (
    echo ERROR: CDK deployment failed
    exit /b 1
)

echo.
echo ========================================
echo Deployment completed successfully!
echo ========================================
echo.
echo Next steps:
echo 1. Start the frontend development server:
echo    cd frontend
echo    npm run dev
echo.
echo 2. Access your application:
echo    - Frontend: http://localhost:3000
echo    - Check CDK outputs for GraphQL API endpoint
echo.
echo 3. The aws-exports.js file has been generated automatically
echo    in the frontend/src directory
echo.
