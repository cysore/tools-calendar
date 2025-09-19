#!/bin/bash

# Team Calendar Sync - Environment Setup Script
# This script helps set up environment variables for different environments

set -e

echo "⚙️ Setting up environment variables for Team Calendar Sync..."

# Environment selection
ENV=${1:-dev}
echo "🏷️ Setting up environment: $ENV"

# Create environment file
ENV_FILE=".env.${ENV}"

if [ -f "$ENV_FILE" ]; then
    echo "⚠️ $ENV_FILE already exists. Creating backup..."
    cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"
fi

echo "📝 Creating $ENV_FILE..."

# Get Amplify outputs
if [ -f "amplify/backend/amplify-meta.json" ]; then
    echo "📊 Reading Amplify configuration..."
    
    # Extract values from amplify-meta.json
    USER_POOL_ID=$(jq -r '.auth.teamcalendarsync.output.UserPoolId // empty' amplify/backend/amplify-meta.json)
    CLIENT_ID=$(jq -r '.auth.teamcalendarsync.output.AppClientIDWeb // empty' amplify/backend/amplify-meta.json)
    IDENTITY_POOL_ID=$(jq -r '.auth.teamcalendarsync.output.IdentityPoolId // empty' amplify/backend/amplify-meta.json)
    REGION=$(jq -r '.providers.awscloudformation.Region // "us-east-1"' amplify/backend/amplify-meta.json)
    TABLE_NAME=$(jq -r '.storage.teamcalendarsyncdb.output.Name // empty' amplify/backend/amplify-meta.json)
else
    echo "⚠️ Amplify meta file not found. Using placeholder values."
    USER_POOL_ID="us-east-1_XXXXXXXXX"
    CLIENT_ID="XXXXXXXXXXXXXXXXXXXXXXXXXX"
    IDENTITY_POOL_ID="us-east-1:XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
    REGION="us-east-1"
    TABLE_NAME="teamcalendarsyncdb-${ENV}"
fi

# Generate random secrets
NEXTAUTH_SECRET=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)

# Create environment file
cat > "$ENV_FILE" << EOF
# AWS Configuration
AWS_REGION=$REGION
NEXT_PUBLIC_AWS_REGION=$REGION

# NextAuth Configuration
NEXTAUTH_URL=https://localhost:3000
NEXTAUTH_SECRET=$NEXTAUTH_SECRET

# AWS Cognito Configuration
COGNITO_USER_POOL_ID=$USER_POOL_ID
COGNITO_CLIENT_ID=$CLIENT_ID
COGNITO_IDENTITY_POOL_ID=$IDENTITY_POOL_ID

# DynamoDB Configuration
DYNAMODB_TABLE_NAME=$TABLE_NAME
NEXT_PUBLIC_DYNAMODB_TABLE_NAME=$TABLE_NAME

# Application Configuration
NODE_ENV=$ENV
NEXT_PUBLIC_APP_URL=https://localhost:3000
NEXT_PUBLIC_API_URL=https://localhost:3000/api

# Security Configuration
ENCRYPTION_KEY=$ENCRYPTION_KEY
JWT_SECRET=$JWT_SECRET

# Feature Flags
NEXT_PUBLIC_ENABLE_PWA=true
NEXT_PUBLIC_ENABLE_OFFLINE=true

# Monitoring and Analytics (Optional - replace with your values)
# NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
# NEXT_PUBLIC_GA_TRACKING_ID=your-ga-tracking-id
EOF

echo "✅ Environment file created: $ENV_FILE"
echo ""
echo "📋 Next steps:"
echo "1. 🔧 Review and update the environment variables in $ENV_FILE"
echo "2. 🔐 Replace placeholder values with actual AWS resource IDs"
echo "3. 🌐 Update NEXTAUTH_URL and NEXT_PUBLIC_APP_URL with your domain"
echo "4. 📊 Add monitoring and analytics keys if needed"
echo ""
echo "⚠️ Important: Never commit .env files to version control!"

# Add to .gitignore if not already present
if ! grep -q "\.env\." .gitignore 2>/dev/null; then
    echo "" >> .gitignore
    echo "# Environment files" >> .gitignore
    echo ".env.*" >> .gitignore
    echo "!.env.example" >> .gitignore
    echo "✅ Added environment files to .gitignore"
fi