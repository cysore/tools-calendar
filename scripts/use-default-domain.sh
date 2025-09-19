#!/bin/bash

# 使用 Amplify 默认域名配置
# Team Calendar Sync - Use Default Domain

set -e

APP_ID="d2f3c99j7qplzg"
REGION="us-west-2"
USER_POOL_ID="us-west-2_yLfoofMwH"
CLIENT_ID="5p4br9u1hlpd7399fsc98obvgf"

echo "🌐 配置使用 Amplify 默认域名"
echo "============================"
echo "应用 ID: $APP_ID"
echo ""

# Amplify 默认域名格式
DEFAULT_DOMAIN="${APP_ID}.amplifyapp.com"

echo "📋 默认域名: https://$DEFAULT_DOMAIN"
echo ""

# 更新 .env.production 文件
echo "📝 更新生产环境配置..."

if [ -f ".env.production" ]; then
    # 备份原文件
    cp .env.production .env.production.backup
    
    # 更新域名配置
    sed -i '' "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=https://$DEFAULT_DOMAIN|g" .env.production
    sed -i '' "s|NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=https://$DEFAULT_DOMAIN|g" .env.production
    sed -i '' "s|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=https://$DEFAULT_DOMAIN/api|g" .env.production
    
    echo "✅ .env.production 已更新"
else
    echo "⚠️ .env.production 文件不存在"
fi

# 更新 .env.local 文件
echo "📝 更新本地开发环境配置..."

if [ -f ".env.local" ]; then
    # 保持本地开发环境使用 localhost
    echo "✅ .env.local 保持使用 localhost:3000"
else
    echo "⚠️ .env.local 文件不存在"
fi

# 更新 Cognito 用户池客户端回调 URL
echo "🔐 更新 Cognito 回调 URL..."

aws cognito-idp update-user-pool-client \
    --user-pool-id "$USER_POOL_ID" \
    --client-id "$CLIENT_ID" \
    --callback-urls "https://$DEFAULT_DOMAIN/api/auth/callback/cognito" "http://localhost:3000/api/auth/callback/cognito" \
    --logout-urls "https://$DEFAULT_DOMAIN" "http://localhost:3000" \
    --allowed-o-auth-flows "code" \
    --allowed-o-auth-scopes "email" "openid" "profile" \
    --allowed-o-auth-flows-user-pool-client \
    --supported-identity-providers "COGNITO" \
    --region "$REGION" > /dev/null

echo "✅ Cognito 回调 URL 已更新"

# 检查部署状态
echo ""
echo "🚀 检查部署状态..."

LATEST_JOB=$(aws amplify list-jobs --app-id "$APP_ID" --branch-name "main" --region "$REGION" --query 'jobSummaries[0].{JobId:jobId,Status:status}' --output json 2>/dev/null || echo '{}')

if [ "$LATEST_JOB" != "{}" ]; then
    JOB_ID=$(echo "$LATEST_JOB" | jq -r '.JobId // empty')
    JOB_STATUS=$(echo "$LATEST_JOB" | jq -r '.Status // empty')
    
    if [ -n "$JOB_ID" ]; then
        echo "📦 最新部署任务: $JOB_ID (状态: $JOB_STATUS)"
        
        case $JOB_STATUS in
            "SUCCEED")
                echo "✅ 部署已成功完成"
                echo "🎉 网站现在可以通过 https://$DEFAULT_DOMAIN 访问"
                ;;
            "RUNNING"|"PENDING")
                echo "⏳ 部署正在进行中..."
                echo "💡 可以使用以下命令监控进度:"
                echo "   aws amplify get-job --app-id $APP_ID --branch-name main --job-id $JOB_ID --region $REGION"
                ;;
            "FAILED")
                echo "❌ 部署失败"
                echo "🔍 查看失败原因:"
                echo "   aws amplify get-job --app-id $APP_ID --branch-name main --job-id $JOB_ID --region $REGION"
                ;;
            *)
                echo "🔄 部署状态: $JOB_STATUS"
                ;;
        esac
    fi
else
    echo "⚠️ 无法获取部署状态"
fi

# 启动新的部署（如果需要）
echo ""
read -p "是否启动新的部署？(y/N): " start_deploy

if [[ $start_deploy =~ ^[Yy]$ ]]; then
    echo "🚀 启动新部署..."
    
    NEW_JOB_ID=$(aws amplify start-job \
        --app-id "$APP_ID" \
        --branch-name "main" \
        --job-type "RELEASE" \
        --region "$REGION" \
        --query 'jobSummary.jobId' --output text)
    
    echo "✅ 新部署已启动，Job ID: $NEW_JOB_ID"
    echo "📊 监控部署进度:"
    echo "   aws amplify get-job --app-id $APP_ID --branch-name main --job-id $NEW_JOB_ID --region $REGION"
fi

echo ""
echo "🎉 配置完成！"
echo ""
echo "📋 重要信息:"
echo "   - 应用 ID: $APP_ID"
echo "   - 默认域名: https://$DEFAULT_DOMAIN"
echo "   - 区域: $REGION"
echo ""
echo "🔗 有用的链接:"
echo "   - Amplify 控制台: https://console.aws.amazon.com/amplify/home?region=$REGION#/$APP_ID"
echo "   - 网站 URL: https://$DEFAULT_DOMAIN"
echo ""
echo "📝 后续步骤:"
echo "   1. 等待部署完成"
echo "   2. 测试网站功能"
echo "   3. 测试用户注册和登录"
echo ""
echo "💡 提示:"
echo "   - 不需要设置自定义域名和 DNS 记录"
echo "   - Amplify 自动提供 HTTPS 和 SSL 证书"
echo "   - 每次推送到 main 分支都会自动部署"