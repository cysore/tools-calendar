#!/bin/bash

# 异步 Amplify 设置脚本
# Team Calendar Sync - Async Amplify Setup

set -e

DOMAIN="tools-calendar.cldteam.com"
APP_ID="d2f3c99j7qplzg"
BRANCH_NAME="main"
REGION="us-west-2"

echo "🚀 异步 Amplify 部署和监控"
echo "=========================="
echo "应用 ID: $APP_ID"
echo "域名: $DOMAIN"
echo "分支: $BRANCH_NAME"
echo ""

# 函数：检查部署状态
check_deployment_status() {
    local job_id=$1
    echo "📊 检查部署状态 (Job ID: $job_id)..."
    
    while true; do
        STATUS=$(aws amplify get-job --app-id "$APP_ID" --branch-name "$BRANCH_NAME" --job-id "$job_id" --region "$REGION" --query 'job.summary.status' --output text)
        
        case $STATUS in
            "SUCCEED")
                echo "✅ 部署成功完成！"
                return 0
                ;;
            "FAILED")
                echo "❌ 部署失败"
                aws amplify get-job --app-id "$APP_ID" --branch-name "$BRANCH_NAME" --job-id "$job_id" --region "$REGION" --query 'job.summary.statusReason' --output text
                return 1
                ;;
            "RUNNING"|"PENDING")
                echo "⏳ 部署进行中... (状态: $STATUS)"
                sleep 30
                ;;
            *)
                echo "🔄 未知状态: $STATUS，继续等待..."
                sleep 30
                ;;
        esac
    done
}

# 函数：检查域名验证状态
check_domain_status() {
    echo "🌐 检查域名验证状态..."
    
    while true; do
        DOMAIN_STATUS=$(aws amplify get-domain-association --app-id "$APP_ID" --domain-name "$DOMAIN" --region "$REGION" --query 'domainAssociation.domainStatus' --output text 2>/dev/null || echo "ERROR")
        
        case $DOMAIN_STATUS in
            "AVAILABLE")
                echo "✅ 域名验证成功！"
                echo "🎉 网站现在可以通过 https://$DOMAIN 访问"
                return 0
                ;;
            "FAILED")
                echo "❌ 域名验证失败"
                aws amplify get-domain-association --app-id "$APP_ID" --domain-name "$DOMAIN" --region "$REGION" --query 'domainAssociation.statusReason' --output text 2>/dev/null || echo "无法获取失败原因"
                return 1
                ;;
            "PENDING_VERIFICATION"|"CREATING"|"REQUESTING_CERTIFICATE"|"PENDING_DEPLOYMENT")
                echo "⏳ 域名验证中... (状态: $DOMAIN_STATUS)"
                echo "💡 请确保已在 DNS 提供商处添加了 CNAME 记录"
                sleep 60
                ;;
            "ERROR")
                echo "⚠️ 无法获取域名状态，可能权限不足或域名未配置"
                return 1
                ;;
            *)
                echo "🔄 未知域名状态: $DOMAIN_STATUS，继续等待..."
                sleep 60
                ;;
        esac
    done
}

# 函数：更新 Cognito 回调 URL
update_cognito_callback() {
    echo "🔐 更新 Cognito 回调 URL..."
    
    USER_POOL_ID="us-west-2_yLfoofMwH"
    CLIENT_ID="5p4br9u1hlpd7399fsc98obvgf"
    
    aws cognito-idp update-user-pool-client \
        --user-pool-id "$USER_POOL_ID" \
        --client-id "$CLIENT_ID" \
        --callback-urls "https://$DOMAIN/api/auth/callback/cognito" "http://localhost:3000/api/auth/callback/cognito" \
        --logout-urls "https://$DOMAIN" "http://localhost:3000" \
        --allowed-o-auth-flows "code" \
        --allowed-o-auth-scopes "email" "openid" "profile" \
        --allowed-o-auth-flows-user-pool-client \
        --supported-identity-providers "COGNITO" \
        --region "$REGION" > /dev/null
    
    echo "✅ Cognito 回调 URL 已更新"
}

# 函数：显示当前状态
show_current_status() {
    echo ""
    echo "📋 当前状态总览"
    echo "=============="
    
    # 应用状态
    echo "📱 Amplify 应用:"
    aws amplify get-app --app-id "$APP_ID" --region "$REGION" --query 'app.{Name:name,Status:defaultDomain}' --output table 2>/dev/null || echo "   无法获取应用状态"
    
    # 最新部署状态
    echo ""
    echo "🚀 最新部署:"
    LATEST_JOB=$(aws amplify list-jobs --app-id "$APP_ID" --branch-name "$BRANCH_NAME" --region "$REGION" --query 'jobSummaries[0].{JobId:jobId,Status:status,StartTime:startTime}' --output table 2>/dev/null || echo "   无法获取部署状态")
    echo "$LATEST_JOB"
    
    # 域名状态
    echo ""
    echo "🌐 域名状态:"
    aws amplify get-domain-association --app-id "$APP_ID" --domain-name "$DOMAIN" --region "$REGION" --query 'domainAssociation.{Domain:domainName,Status:domainStatus,SSL:certificate.type}' --output table 2>/dev/null || echo "   无法获取域名状态"
}

# 主执行流程
main() {
    echo "🔍 获取当前状态..."
    show_current_status
    
    echo ""
    echo "🎯 选择操作:"
    echo "1. 监控部署状态"
    echo "2. 监控域名验证"
    echo "3. 更新 Cognito 设置"
    echo "4. 显示 DNS 设置说明"
    echo "5. 全部执行（推荐）"
    echo ""
    
    read -p "请选择操作 (1-5): " choice
    
    case $choice in
        1)
            LATEST_JOB_ID=$(aws amplify list-jobs --app-id "$APP_ID" --branch-name "$BRANCH_NAME" --region "$REGION" --query 'jobSummaries[0].jobId' --output text)
            if [ "$LATEST_JOB_ID" != "None" ] && [ -n "$LATEST_JOB_ID" ]; then
                check_deployment_status "$LATEST_JOB_ID"
            else
                echo "❌ 没有找到进行中的部署任务"
            fi
            ;;
        2)
            check_domain_status
            ;;
        3)
            update_cognito_callback
            ;;
        4)
            echo ""
            echo "📋 DNS 设置说明"
            echo "=============="
            echo "请在您的 DNS 提供商处添加以下记录："
            echo ""
            
            # 获取最新的 DNS 记录信息
            DOMAIN_INFO=$(aws amplify get-domain-association --app-id "$APP_ID" --domain-name "$DOMAIN" --region "$REGION" 2>/dev/null || echo "")
            
            if [ -n "$DOMAIN_INFO" ]; then
                echo "主域名 CNAME:"
                echo "$DOMAIN_INFO" | jq -r '.domainAssociation.subDomains[0].dnsRecord' 2>/dev/null || echo "无法获取 CNAME 记录"
                echo ""
                echo "SSL 验证 CNAME:"
                echo "$DOMAIN_INFO" | jq -r '.domainAssociation.certificateVerificationDNSRecord' 2>/dev/null || echo "无法获取 SSL 验证记录"
            else
                echo "⚠️ 无法获取 DNS 记录信息"
            fi
            ;;
        5)
            echo "🚀 开始全部操作..."
            
            # 1. 更新 Cognito
            update_cognito_callback
            
            # 2. 检查部署状态
            LATEST_JOB_ID=$(aws amplify list-jobs --app-id "$APP_ID" --branch-name "$BRANCH_NAME" --region "$REGION" --query 'jobSummaries[0].jobId' --output text)
            if [ "$LATEST_JOB_ID" != "None" ] && [ -n "$LATEST_JOB_ID" ]; then
                echo ""
                echo "📦 监控部署进度..."
                check_deployment_status "$LATEST_JOB_ID" &
                DEPLOY_PID=$!
            fi
            
            # 3. 检查域名状态
            echo ""
            echo "🌐 监控域名验证..."
            check_domain_status &
            DOMAIN_PID=$!
            
            # 等待两个进程完成
            if [ -n "$DEPLOY_PID" ]; then
                wait $DEPLOY_PID
                echo "✅ 部署监控完成"
            fi
            
            wait $DOMAIN_PID
            echo "✅ 域名监控完成"
            
            echo ""
            echo "🎉 所有操作完成！"
            ;;
        *)
            echo "❌ 无效选择"
            exit 1
            ;;
    esac
}

# 创建后台监控脚本
create_background_monitor() {
    cat > scripts/monitor-deployment.sh << 'EOF'
#!/bin/bash
# 后台监控脚本

APP_ID="d2f3c99j7qplzg"
DOMAIN="tools-calendar.cldteam.com"
BRANCH_NAME="main"
REGION="us-west-2"

echo "🔄 后台监控启动..."
echo "时间: $(date)"
echo "应用: $APP_ID"
echo "域名: $DOMAIN"

# 监控部署
LATEST_JOB_ID=$(aws amplify list-jobs --app-id "$APP_ID" --branch-name "$BRANCH_NAME" --region "$REGION" --query 'jobSummaries[0].jobId' --output text)

if [ "$LATEST_JOB_ID" != "None" ] && [ -n "$LATEST_JOB_ID" ]; then
    echo "📦 监控部署 Job ID: $LATEST_JOB_ID"
    
    while true; do
        STATUS=$(aws amplify get-job --app-id "$APP_ID" --branch-name "$BRANCH_NAME" --job-id "$LATEST_JOB_ID" --region "$REGION" --query 'job.summary.status' --output text)
        echo "$(date): 部署状态 - $STATUS"
        
        if [ "$STATUS" = "SUCCEED" ] || [ "$STATUS" = "FAILED" ]; then
            break
        fi
        
        sleep 30
    done
fi

# 监控域名
while true; do
    DOMAIN_STATUS=$(aws amplify get-domain-association --app-id "$APP_ID" --domain-name "$DOMAIN" --region "$REGION" --query 'domainAssociation.domainStatus' --output text 2>/dev/null || echo "ERROR")
    echo "$(date): 域名状态 - $DOMAIN_STATUS"
    
    if [ "$DOMAIN_STATUS" = "AVAILABLE" ] || [ "$DOMAIN_STATUS" = "FAILED" ]; then
        break
    fi
    
    sleep 60
done

echo "🎉 监控完成: $(date)"
EOF

    chmod +x scripts/monitor-deployment.sh
    echo "📝 后台监控脚本已创建: scripts/monitor-deployment.sh"
    echo "💡 可以运行 'nohup ./scripts/monitor-deployment.sh > deployment.log 2>&1 &' 进行后台监控"
}

# 检查是否需要创建后台监控
if [ "$1" = "--create-monitor" ]; then
    create_background_monitor
    exit 0
fi

# 运行主程序
main