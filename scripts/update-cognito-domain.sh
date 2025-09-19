#!/bin/bash

# 更新 Cognito 用户池回调 URL
# Team Calendar Sync - Update Cognito Domain

set -e

DOMAIN="tools-calendar.cldteam.com"
USER_POOL_ID="us-west-2_yLfoofMwH"
CLIENT_ID="5p4br9u1hlpd7399fsc98obvgf"
REGION="us-west-2"

echo "🔐 更新 Cognito 用户池回调 URL"
echo "================================"
echo "域名: $DOMAIN"
echo "用户池 ID: $USER_POOL_ID"
echo "客户端 ID: $CLIENT_ID"
echo ""

# 更新用户池客户端配置
echo "⚙️ 更新用户池客户端配置..."

aws cognito-idp update-user-pool-client \
    --user-pool-id "$USER_POOL_ID" \
    --client-id "$CLIENT_ID" \
    --callback-urls "https://$DOMAIN/api/auth/callback/cognito" "http://localhost:3000/api/auth/callback/cognito" \
    --logout-urls "https://$DOMAIN" "http://localhost:3000" \
    --allowed-o-auth-flows "code" \
    --allowed-o-auth-scopes "email" "openid" "profile" \
    --allowed-o-auth-flows-user-pool-client \
    --supported-identity-providers "COGNITO" \
    --region "$REGION"

echo "✅ Cognito 用户池客户端配置已更新"

# 显示当前配置
echo ""
echo "📋 当前配置:"
aws cognito-idp describe-user-pool-client \
    --user-pool-id "$USER_POOL_ID" \
    --client-id "$CLIENT_ID" \
    --region "$REGION" \
    --query 'UserPoolClient.{CallbackURLs:CallbackURLs,LogoutURLs:LogoutURLs}' \
    --output table

echo ""
echo "✅ Cognito 域名配置完成！"