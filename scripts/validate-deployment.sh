#!/bin/bash

# Team Calendar Sync - Deployment Validation Script
# This script validates the deployment configuration

set -e

echo "🔍 Validating AWS Amplify deployment configuration..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Validation results
ERRORS=0
WARNINGS=0

# Function to print status
print_status() {
    local status=$1
    local message=$2
    
    case $status in
        "OK")
            echo -e "${GREEN}✅ $message${NC}"
            ;;
        "WARNING")
            echo -e "${YELLOW}⚠️  $message${NC}"
            ((WARNINGS++))
            ;;
        "ERROR")
            echo -e "${RED}❌ $message${NC}"
            ((ERRORS++))
            ;;
    esac
}

echo "📋 Checking prerequisites..."

# Check Node.js version
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1)
    
    if [ "$MAJOR_VERSION" -ge 18 ]; then
        print_status "OK" "Node.js version: v$NODE_VERSION"
    else
        print_status "ERROR" "Node.js version v$NODE_VERSION is too old. Required: v18+"
    fi
else
    print_status "ERROR" "Node.js is not installed"
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_status "OK" "npm version: v$NPM_VERSION"
else
    print_status "ERROR" "npm is not installed"
fi

# Check AWS CLI
if command -v aws &> /dev/null; then
    AWS_VERSION=$(aws --version 2>&1 | cut -d' ' -f1 | cut -d'/' -f2)
    print_status "OK" "AWS CLI version: $AWS_VERSION"
    
    # Check AWS credentials
    if aws sts get-caller-identity &> /dev/null; then
        ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
        print_status "OK" "AWS credentials configured (Account: $ACCOUNT_ID)"
    else
        print_status "ERROR" "AWS credentials not configured. Run 'aws configure'"
    fi
else
    print_status "ERROR" "AWS CLI is not installed"
fi

# Check Amplify CLI
if command -v amplify &> /dev/null; then
    AMPLIFY_VERSION=$(amplify --version 2>&1 | head -n1)
    print_status "OK" "Amplify CLI installed: $AMPLIFY_VERSION"
else
    print_status "ERROR" "Amplify CLI is not installed. Run 'npm install -g @aws-amplify/cli'"
fi

echo ""
echo "📁 Checking configuration files..."

# Check required files
REQUIRED_FILES=(
    "amplify.yml"
    ".env.example"
    "package.json"
    "next.config.js"
    "amplify/.config/project-config.json"
    "amplify/backend/backend-config.json"
    "amplify/team-provider-info.json"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_status "OK" "Configuration file exists: $file"
    else
        print_status "ERROR" "Missing configuration file: $file"
    fi
done

# Check deployment scripts
SCRIPTS=(
    "scripts/deploy.sh"
    "scripts/setup-env.sh"
    "scripts/setup-domain.sh"
)

for script in "${SCRIPTS[@]}"; do
    if [ -f "$script" ]; then
        if [ -x "$script" ]; then
            print_status "OK" "Deployment script ready: $script"
        else
            print_status "WARNING" "Script not executable: $script (run 'chmod +x $script')"
        fi
    else
        print_status "ERROR" "Missing deployment script: $script"
    fi
done

echo ""
echo "🔧 Checking package.json configuration..."

# Check package.json scripts
if [ -f "package.json" ]; then
    REQUIRED_SCRIPTS=(
        "build"
        "deploy"
        "deploy:dev"
        "deploy:prod"
        "setup:env"
        "setup:domain"
    )
    
    for script in "${REQUIRED_SCRIPTS[@]}"; do
        if jq -e ".scripts.\"$script\"" package.json > /dev/null 2>&1; then
            print_status "OK" "npm script configured: $script"
        else
            print_status "WARNING" "Missing npm script: $script"
        fi
    done
fi

echo ""
echo "🌐 Checking environment configuration..."

# Check .env.example
if [ -f ".env.example" ]; then
    REQUIRED_ENV_VARS=(
        "AWS_REGION"
        "NEXTAUTH_URL"
        "NEXTAUTH_SECRET"
        "COGNITO_USER_POOL_ID"
        "COGNITO_CLIENT_ID"
        "DYNAMODB_TABLE_NAME"
    )
    
    for var in "${REQUIRED_ENV_VARS[@]}"; do
        if grep -q "^$var=" .env.example; then
            print_status "OK" "Environment variable template: $var"
        else
            print_status "WARNING" "Missing environment variable in template: $var"
        fi
    done
fi

# Check .gitignore
if [ -f ".gitignore" ]; then
    if grep -q "\.env\." .gitignore; then
        print_status "OK" "Environment files ignored in git"
    else
        print_status "WARNING" "Environment files not ignored in .gitignore"
    fi
fi

echo ""
echo "🔄 Checking CI/CD configuration..."

# Check GitHub Actions
if [ -f ".github/workflows/deploy.yml" ]; then
    print_status "OK" "GitHub Actions workflow configured"
else
    print_status "WARNING" "GitHub Actions workflow not found"
fi

echo ""
echo "📊 Validation Summary"
echo "===================="

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    print_status "OK" "All checks passed! Deployment configuration is ready."
    echo ""
    echo "🚀 Next steps:"
    echo "1. Run 'amplify init' to initialize your project"
    echo "2. Run 'npm run setup:env dev' to configure environment variables"
    echo "3. Run 'npm run deploy:dev' to deploy to development"
    echo "4. Run 'npm run setup:domain your-domain.com' to configure custom domain"
elif [ $ERRORS -eq 0 ]; then
    print_status "WARNING" "Configuration ready with $WARNINGS warnings"
    echo ""
    echo "⚠️  Please review the warnings above before deploying"
else
    print_status "ERROR" "Found $ERRORS errors and $WARNINGS warnings"
    echo ""
    echo "❌ Please fix the errors above before proceeding with deployment"
    exit 1
fi

echo ""
echo "📚 For detailed deployment instructions, see:"
echo "   - README-DEPLOYMENT.md"
echo "   - docs/deployment.md"