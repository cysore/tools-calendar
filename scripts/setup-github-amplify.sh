#!/bin/bash

# GitHub 和 Amplify 连接设置脚本
# Team Calendar Sync - GitHub Amplify Setup

set -e

DOMAIN="tools-calendar.cldteam.com"
APP_NAME="team-calendar-sync"
REPO_URL="https://github.com/cysore/tools-calendar"
BRANCH_NAME="main"

echo "🔗 设置 GitHub 和 Amplify 连接"
echo "================================"
echo "域名: $DOMAIN"
echo "仓库: $REPO_URL"
echo "分支: $BRANCH_NAME"
echo ""

# 检查 AWS CLI
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI 未安装"
    exit 1
fi

# 获取当前区域
REGION=$(aws configure get region || echo "us-west-2")
echo "📍 当前区域: $REGION"

# 提示用户创建 GitHub 访问令牌
echo "🔑 GitHub 访问令牌设置"
echo "======================"
echo ""
echo "请按照以下步骤创建 GitHub 个人访问令牌："
echo ""
echo "1. 访问 GitHub Settings: https://github.com/settings/tokens"
echo "2. 点击 'Generate new token' -> 'Generate new token (classic)'"
echo "3. 设置令牌名称: 'AWS Amplify - Team Calendar'"
echo "4. 选择过期时间: 建议选择 '90 days' 或 'No expiration'"
echo "5. 选择以下权限范围 (scopes):"
echo "   ✅ repo (Full control of private repositories)"
echo "   ✅ admin:repo_hook (Full control of repository hooks)"
echo "6. 点击 'Generate token'"
echo "7. 复制生成的令牌（只会显示一次）"
echo ""

read -p "请输入您的 GitHub 访问令牌: " GITHUB_TOKEN

if [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ GitHub 访问令牌不能为空"
    exit 1
fi

echo ""
echo "🔍 查找现有 Amplify 应用..."
APP_ID=$(aws amplify list-apps --region "$REGION" --query "apps[?name=='$APP_NAME'].appId" --output text)

if [ -z "$APP_ID" ]; then
    echo "📝 创建新的 Amplify 应用..."
    
    # 创建 Amplify 应用并连接 GitHub
    APP_ID=$(aws amplify create-app \
        --name "$APP_NAME" \
        --description "Team Calendar Sync Application" \
        --repository "$REPO_URL" \
        --platform "WEB" \
        --oauth-token "$GITHUB_TOKEN" \
        --region "$REGION" \
        --query 'app.appId' --output text)
    
    echo "✅ Amplify 应用创建成功，ID: $APP_ID"
else
    echo "✅ 找到现有 Amplify 应用，ID: $APP_ID"
    
    # 更新应用的 GitHub 连接
    echo "🔄 更新 GitHub 连接..."
    aws amplify update-app \
        --app-id "$APP_ID" \
        --repository "$REPO_URL" \
        --oauth-token "$GITHUB_TOKEN" \
        --region "$REGION" > /dev/null
    
    echo "✅ GitHub 连接已更新"
fi

# 创建分支
echo "🌿 设置 $BRANCH_NAME 分支..."
BRANCH_EXISTS=$(aws amplify list-branches --app-id "$APP_ID" --region "$REGION" --query "branches[?branchName=='$BRANCH_NAME'].branchName" --output text)

if [ -z "$BRANCH_EXISTS" ]; then
    aws amplify create-branch \
        --app-id "$APP_ID" \
        --branch-name "$BRANCH_NAME" \
        --description "Main production branch" \
        --enable-auto-build \
        --region "$REGION"
    
    echo "✅ $BRANCH_NAME 分支创建成功"
else
    echo "✅ $BRANCH_NAME 分支已存在"
fi

# 设置环境变量
echo "⚙️ 设置 Amplify 环境变量..."

if [ -f ".env.production" ]; then
    # 创建环境变量 JSON
    ENV_VARS="{"
    FIRST=true
    
    while IFS='=' read -r key value; do
        # 跳过注释和空行
        if [[ $key =~ ^[[:space:]]*# ]] || [[ -z $key ]]; then
            continue
        fi
        
        # 清理键值对
        key=$(echo "$key" | xargs)
        value=$(echo "$value" | xargs)
        
        if [ -n "$key" ] && [ -n "$value" ]; then
            if [ "$FIRST" = true ]; then
                FIRST=false
            else
                ENV_VARS="$ENV_VARS,"
            fi
            ENV_VARS="$ENV_VARS\"$key\":\"$value\""
        fi
    done < .env.production
    
    ENV_VARS="$ENV_VARS}"
    
    # 更新应用环境变量
    aws amplify update-app \
        --app-id "$APP_ID" \
        --environment-variables "$ENV_VARS" \
        --region "$REGION" > /dev/null
    
    echo "✅ 环境变量设置完成"
else
    echo "⚠️ 未找到 .env.production 文件"
fi

# 设置自定义域名
echo "🌐 设置自定义域名..."

# 检查域名是否已配置
DOMAIN_EXISTS=$(aws amplify list-domain-associations --app-id "$APP_ID" --region "$REGION" --query "domainAssociations[?domainName=='$DOMAIN'].domainName" --output text 2>/dev/null || echo "")

if [ -z "$DOMAIN_EXISTS" ]; then
    echo "📝 创建域名关联..."
    
    aws amplify create-domain-association \
        --app-id "$APP_ID" \
        --domain-name "$DOMAIN" \
        --sub-domain-settings "prefix=,branchName=$BRANCH_NAME" \
        --region "$REGION"
    
    echo "✅ 域名关联创建成功"
else
    echo "✅ 域名 $DOMAIN 已配置"
fi

# 获取域名解析信息
echo ""
echo "📋 域名解析信息"
echo "=============="

# 等待几秒让域名关联完成
sleep 3

DOMAIN_INFO=$(aws amplify get-domain-association \
    --app-id "$APP_ID" \
    --domain-name "$DOMAIN" \
    --region "$REGION" 2>/dev/null || echo "")

if [ -n "$DOMAIN_INFO" ]; then
    # 提取 CNAME 目标
    CNAME_TARGET=$(echo "$DOMAIN_INFO" | jq -r '.domainAssociation.subDomains[0].dnsRecord.value' 2>/dev/null || echo "")
    
    if [ -n "$CNAME_TARGET" ] && [ "$CNAME_TARGET" != "null" ]; then
        echo "🎯 请在您的 DNS 提供商处添加以下 CNAME 记录："
        echo ""
        echo "   类型: CNAME"
        echo "   名称: tools-calendar"
        echo "   值: $CNAME_TARGET"
        echo "   TTL: 300 (或默认值)"
        echo ""
    else
        echo "⏳ 域名解析信息正在生成中，请稍后运行以下命令获取："
        echo "   aws amplify get-domain-association --app-id $APP_ID --domain-name $DOMAIN --region $REGION"
    fi
else
    echo "⚠️ 无法获取域名解析信息，请检查域名配置"
fi

# 启动部署
echo "🚀 启动部署..."
JOB_ID=$(aws amplify start-job \
    --app-id "$APP_ID" \
    --branch-name "$BRANCH_NAME" \
    --job-type "RELEASE" \
    --region "$REGION" \
    --query 'jobSummary.jobId' --output text)

echo "✅ 部署任务已启动，Job ID: $JOB_ID"

echo ""
echo "🎉 GitHub 和域名设置完成！"
echo ""
echo "📋 重要信息:"
echo "   - Amplify 应用 ID: $APP_ID"
echo "   - 域名: $DOMAIN"
echo "   - 部署任务 ID: $JOB_ID"
echo "   - GitHub 仓库: $REPO_URL"
echo ""
echo "🔗 有用的链接:"
echo "   - Amplify 控制台: https://console.aws.amazon.com/amplify/home?region=$REGION#/$APP_ID"
echo "   - 部署状态: https://console.aws.amazon.com/amplify/home?region=$REGION#/$APP_ID/$BRANCH_NAME/$JOB_ID"
echo ""
echo "📝 后续步骤:"
echo "   1. 🌐 在 DNS 提供商处配置上述 CNAME 记录"
echo "   2. ⏳ 等待 SSL 证书验证完成（通常需要几分钟到几小时）"
echo "   3. 📊 监控部署进度"
echo "   4. 🧪 测试应用功能"
echo ""
echo "💡 提示:"
echo "   - 每次推送到 $BRANCH_NAME 分支都会自动触发部署"
echo "   - 可以在 Amplify 控制台查看构建日志和部署状态"