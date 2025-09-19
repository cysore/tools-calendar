#!/bin/bash

# 检查部署状态脚本
# Team Calendar Sync - Check Deployment Status

APP_ID="d2f3c99j7qplzg"
REGION="us-west-2"
DEFAULT_DOMAIN="${APP_ID}.amplifyapp.com"

echo "📊 检查部署状态"
echo "=============="
echo "应用 ID: $APP_ID"
echo "默认域名: https://$DEFAULT_DOMAIN"
echo ""

# 获取最新部署状态
echo "🚀 最新部署状态:"
aws amplify list-jobs --app-id "$APP_ID" --branch-name "main" --region "$REGION" --max-results 3 --query 'jobSummaries[].{JobId:jobId,Status:status,StartTime:startTime,CommitId:commitId}' --output table

echo ""
echo "🔗 快速链接:"
echo "   - 网站: https://$DEFAULT_DOMAIN"
echo "   - Amplify 控制台: https://console.aws.amazon.com/amplify/home?region=$REGION#/$APP_ID"
echo ""

# 检查网站是否可访问
echo "🌐 检查网站可访问性:"
if curl -s -o /dev/null -w "%{http_code}" "https://$DEFAULT_DOMAIN" | grep -q "200\|301\|302"; then
    echo "✅ 网站可以访问"
else
    echo "⚠️ 网站可能还在部署中或无法访问"
fi

echo ""
echo "💡 提示:"
echo "   - 如果部署状态为 RUNNING，请等待几分钟"
echo "   - 如果部署失败，可以查看详细日志"
echo "   - 可以通过 git push 触发新的部署"