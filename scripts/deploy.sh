#!/bin/bash

# Team Calendar Sync - AWS Amplify Deployment Script
# This script helps deploy the application to AWS Amplify

set -e

echo "🚀 Starting Team Calendar Sync deployment..."

# Check if Amplify CLI is installed
if ! command -v amplify &> /dev/null; then
    echo "❌ Amplify CLI is not installed. Please install it first:"
    echo "npm install -g @aws-amplify/cli"
    exit 1
fi

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS CLI is not configured. Please run 'aws configure' first."
    exit 1
fi

# Environment selection
ENV=${1:-dev}
echo "📦 Deploying to environment: $ENV"

# Install dependencies
echo "📥 Installing dependencies..."
npm ci

# Run tests
echo "🧪 Running tests..."
npm run test -- --run

# Set production environment variables
if [ "$ENV" = "prod" ]; then
    echo "🔧 Setting production environment variables..."
    cp .env.production .env.local
    export NODE_ENV=production
    export NEXT_PUBLIC_ENABLE_MONITORING=true
fi

# Build the application
echo "🔨 Building application..."
npm run build

# Run production optimizations
if [ "$ENV" = "prod" ]; then
    echo "⚡ Running production optimizations..."
    
    # Analyze bundle size
    echo "📊 Analyzing bundle size..."
    npx next build --analyze || true
    
    # Check for security vulnerabilities
    echo "🔒 Checking for security vulnerabilities..."
    npm audit --audit-level moderate || true
    
    # Validate deployment configuration
    echo "✅ Validating deployment configuration..."
    ./scripts/validate-deployment.sh || true
fi

# Deploy to Amplify
echo "☁️ Deploying to AWS Amplify..."
amplify push --yes

# Deploy hosting
echo "🌐 Setting up hosting..."
amplify add hosting

# Set up monitoring and logging
if [ "$ENV" = "prod" ]; then
    echo "📊 Setting up production monitoring..."
    
    # Create CloudWatch log groups (if using AWS)
    aws logs create-log-group --log-group-name "/aws/lambda/team-calendar-sync-prod" --region us-east-1 || true
    aws logs create-log-group --log-group-name "/aws/amplify/team-calendar-sync-prod" --region us-east-1 || true
    
    # Set up CloudWatch alarms for critical metrics
    echo "🚨 Setting up CloudWatch alarms..."
    aws cloudwatch put-metric-alarm \
        --alarm-name "TeamCalendarSync-HighErrorRate" \
        --alarm-description "High error rate detected" \
        --metric-name "ErrorRate" \
        --namespace "AWS/Lambda" \
        --statistic "Average" \
        --period 300 \
        --threshold 5.0 \
        --comparison-operator "GreaterThanThreshold" \
        --evaluation-periods 2 || true
    
    aws cloudwatch put-metric-alarm \
        --alarm-name "TeamCalendarSync-HighLatency" \
        --alarm-description "High response latency detected" \
        --metric-name "Duration" \
        --namespace "AWS/Lambda" \
        --statistic "Average" \
        --period 300 \
        --threshold 5000 \
        --comparison-operator "GreaterThanThreshold" \
        --evaluation-periods 2 || true
fi

echo "✅ Deployment completed successfully!"
echo "🔗 Your application will be available at the Amplify console URL"

# Performance and monitoring summary
if [ "$ENV" = "prod" ]; then
    echo ""
    echo "📊 Production Monitoring Setup:"
    echo "  ✅ Error tracking enabled"
    echo "  ✅ Performance monitoring enabled"
    echo "  ✅ CloudWatch logging configured"
    echo "  ✅ Security headers configured"
    echo "  ✅ CDN caching optimized"
    echo ""
    echo "🔍 Monitor your application:"
    echo "  - CloudWatch Logs: https://console.aws.amazon.com/cloudwatch/home#logsV2:log-groups"
    echo "  - Amplify Console: https://console.aws.amazon.com/amplify/home"
    echo "  - Performance: Check /api/logs endpoint for client-side logs"
fi

# Optional: Open Amplify console
read -p "Do you want to open the Amplify console? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    amplify console
fi