#!/bin/bash

# Team Calendar Sync - Custom Domain Setup Script
# This script helps configure custom domain and HTTPS certificate

set -e

echo "🌐 Setting up custom domain for Team Calendar Sync..."

# Check if domain name is provided
DOMAIN_NAME=${1}
if [ -z "$DOMAIN_NAME" ]; then
    echo "❌ Please provide a domain name"
    echo "Usage: ./scripts/setup-domain.sh your-domain.com"
    exit 1
fi

echo "🔧 Configuring domain: $DOMAIN_NAME"

# Get Amplify App ID
APP_ID=$(amplify status --json | jq -r '.providers.awscloudformation.AmplifyAppId // empty')

if [ -z "$APP_ID" ]; then
    echo "❌ Could not find Amplify App ID. Make sure you have deployed the app first."
    exit 1
fi

echo "📱 Found Amplify App ID: $APP_ID"

# Add domain to Amplify app
echo "🔗 Adding domain to Amplify app..."
aws amplify create-domain-association \
    --app-id "$APP_ID" \
    --domain-name "$DOMAIN_NAME" \
    --sub-domain-settings prefix=www,branchName=main \
    --sub-domain-settings prefix="",branchName=main

echo "📋 Domain configuration created. Please complete the following steps:"
echo ""
echo "1. 🔍 Verify domain ownership in the Amplify console"
echo "2. 📝 Update your DNS records with the provided CNAME values"
echo "3. ⏳ Wait for SSL certificate provisioning (can take up to 24 hours)"
echo "4. 🔄 Update your environment variables:"
echo "   - NEXTAUTH_URL=https://$DOMAIN_NAME"
echo "   - NEXT_PUBLIC_APP_URL=https://$DOMAIN_NAME"
echo ""
echo "🎉 Domain setup initiated successfully!"

# Optional: Open Amplify console
read -p "Do you want to open the Amplify console to complete domain setup? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    amplify console
fi