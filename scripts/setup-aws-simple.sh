#!/bin/bash

# 简单的 AWS 环境设置脚本
# Team Calendar Sync - Simple AWS Setup

set -e

echo "🚀 Team Calendar Sync - 简单 AWS 环境设置"
echo "=========================================="

# 检查 AWS CLI
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI 未安装，请先安装 AWS CLI"
    exit 1
fi

# 检查 AWS 配置
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS 凭证未配置，请先运行 'aws configure'"
    exit 1
fi

echo "✅ AWS CLI 已配置"

# 获取当前 AWS 账户信息
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=$(aws configure get region || echo "us-east-1")
USER_ARN=$(aws sts get-caller-identity --query Arn --output text)

echo "📋 当前 AWS 配置:"
echo "   账户 ID: $ACCOUNT_ID"
echo "   区域: $REGION"
echo "   用户: $USER_ARN"
echo ""

# 创建必要的 IAM 策略文档
echo "📝 创建 IAM 策略文档..."

# Amplify 部署策略
cat > /tmp/amplify-deploy-policy.json << 'EOF'
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "amplify:*",
                "cloudformation:*",
                "cognito-idp:*",
                "cognito-identity:*",
                "dynamodb:*",
                "iam:*",
                "lambda:*",
                "logs:*",
                "s3:*",
                "ssm:*",
                "appsync:*",
                "apigateway:*"
            ],
            "Resource": "*"
        }
    ]
}
EOF

echo "✅ IAM 策略文档已创建"

# 创建 DynamoDB 表
echo "🗄️ 创建 DynamoDB 表..."

TABLE_NAME="team-calendar-sync-${REGION}"

# 检查表是否已存在
if aws dynamodb describe-table --table-name "$TABLE_NAME" --region "$REGION" &> /dev/null; then
    echo "⚠️ 表 $TABLE_NAME 已存在，跳过创建"
else
    # 创建 DynamoDB 表配置文件
    cat > /tmp/dynamodb-table.json << EOF
{
    "TableName": "$TABLE_NAME",
    "AttributeDefinitions": [
        {
            "AttributeName": "PK",
            "AttributeType": "S"
        },
        {
            "AttributeName": "SK",
            "AttributeType": "S"
        },
        {
            "AttributeName": "GSI1PK",
            "AttributeType": "S"
        },
        {
            "AttributeName": "GSI1SK",
            "AttributeType": "S"
        }
    ],
    "KeySchema": [
        {
            "AttributeName": "PK",
            "KeyType": "HASH"
        },
        {
            "AttributeName": "SK",
            "KeyType": "RANGE"
        }
    ],
    "GlobalSecondaryIndexes": [
        {
            "IndexName": "GSI1",
            "KeySchema": [
                {
                    "AttributeName": "GSI1PK",
                    "KeyType": "HASH"
                },
                {
                    "AttributeName": "GSI1SK",
                    "KeyType": "RANGE"
                }
            ],
            "Projection": {
                "ProjectionType": "ALL"
            },
            "ProvisionedThroughput": {
                "ReadCapacityUnits": 5,
                "WriteCapacityUnits": 5
            }
        }
    ],
    "ProvisionedThroughput": {
        "ReadCapacityUnits": 5,
        "WriteCapacityUnits": 5
    }
}
EOF

    aws dynamodb create-table \
        --cli-input-json file:///tmp/dynamodb-table.json \
        --region "$REGION"
    
    echo "✅ DynamoDB 表 $TABLE_NAME 创建成功"
fi

# 创建 Cognito 用户池
echo "👤 创建 Cognito 用户池..."

USER_POOL_NAME="team-calendar-sync-${REGION}"

# 检查用户池是否已存在
EXISTING_POOLS=$(aws cognito-idp list-user-pools --max-results 60 --region "$REGION" --query "UserPools[?Name=='$USER_POOL_NAME'].Id" --output text)

if [ -n "$EXISTING_POOLS" ]; then
    USER_POOL_ID="$EXISTING_POOLS"
    echo "⚠️ 用户池 $USER_POOL_NAME 已存在，ID: $USER_POOL_ID"
else
    USER_POOL_ID=$(aws cognito-idp create-user-pool \
        --pool-name "$USER_POOL_NAME" \
        --policies "PasswordPolicy={MinimumLength=8,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true,RequireSymbols=false}" \
        --auto-verified-attributes email \
        --username-attributes email \
        --region "$REGION" \
        --query 'UserPool.Id' --output text)
    
    echo "✅ Cognito 用户池创建成功，ID: $USER_POOL_ID"
fi

# 创建用户池客户端
echo "🔑 创建用户池客户端..."

CLIENT_NAME="team-calendar-sync-client"
CLIENT_ID=$(aws cognito-idp create-user-pool-client \
    --user-pool-id "$USER_POOL_ID" \
    --client-name "$CLIENT_NAME" \
    --generate-secret \
    --explicit-auth-flows ADMIN_NO_SRP_AUTH USER_PASSWORD_AUTH \
    --region "$REGION" \
    --query 'UserPoolClient.ClientId' --output text)

echo "✅ 用户池客户端创建成功，ID: $CLIENT_ID"

# 获取客户端密钥
CLIENT_SECRET=$(aws cognito-idp describe-user-pool-client \
    --user-pool-id "$USER_POOL_ID" \
    --client-id "$CLIENT_ID" \
    --region "$REGION" \
    --query 'UserPoolClient.ClientSecret' --output text)

# 创建身份池
echo "🆔 创建 Cognito 身份池..."

IDENTITY_POOL_NAME="team_calendar_sync_${REGION//-/_}"
IDENTITY_POOL_ID=$(aws cognito-identity create-identity-pool \
    --identity-pool-name "$IDENTITY_POOL_NAME" \
    --allow-unauthenticated-identities \
    --cognito-identity-providers ProviderName=cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID},ClientId=${CLIENT_ID} \
    --region "$REGION" \
    --query 'IdentityPoolId' --output text)

echo "✅ 身份池创建成功，ID: $IDENTITY_POOL_ID"

# 生成环境变量文件
echo "📄 生成环境变量文件..."

cat > .env.production << EOF
# AWS Configuration
AWS_REGION=$REGION
NEXT_PUBLIC_AWS_REGION=$REGION

# NextAuth Configuration
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=$(openssl rand -base64 32)

# AWS Cognito Configuration
COGNITO_USER_POOL_ID=$USER_POOL_ID
COGNITO_CLIENT_ID=$CLIENT_ID
COGNITO_CLIENT_SECRET=$CLIENT_SECRET
COGNITO_IDENTITY_POOL_ID=$IDENTITY_POOL_ID
NEXT_PUBLIC_USER_POOL_ID=$USER_POOL_ID
NEXT_PUBLIC_USER_POOL_CLIENT_ID=$CLIENT_ID
NEXT_PUBLIC_IDENTITY_POOL_ID=$IDENTITY_POOL_ID

# DynamoDB Configuration
DYNAMODB_TABLE_NAME=$TABLE_NAME
NEXT_PUBLIC_DYNAMODB_TABLE_NAME=$TABLE_NAME

# Application Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_API_URL=https://your-domain.com/api

# Security Configuration
ENCRYPTION_KEY=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)

# Feature Flags
NEXT_PUBLIC_ENABLE_PWA=true
NEXT_PUBLIC_ENABLE_OFFLINE=true
EOF

# 创建开发环境文件
cp .env.production .env.local

# 更新开发环境的 URL
sed -i '' 's|https://your-domain.com|http://localhost:3000|g' .env.local

echo "✅ 环境变量文件已创建:"
echo "   - .env.production (生产环境)"
echo "   - .env.local (开发环境)"

echo ""
echo "🎉 AWS 环境设置完成！"
echo ""
echo "📋 创建的资源:"
echo "   - DynamoDB 表: $TABLE_NAME"
echo "   - Cognito 用户池: $USER_POOL_ID"
echo "   - 用户池客户端: $CLIENT_ID"
echo "   - 身份池: $IDENTITY_POOL_ID"
echo ""
echo "📝 下一步:"
echo "   1. 检查并更新 .env.local 中的配置"
echo "   2. 运行 'npm run dev' 启动开发服务器"
echo "   3. 测试用户注册和登录功能"
echo ""
echo "⚠️ 重要提醒:"
echo "   - 请妥善保管 .env.production 文件"
echo "   - 不要将包含敏感信息的 .env 文件提交到版本控制"
echo "   - 在部署到生产环境前，请更新 NEXTAUTH_URL 和相关域名"
echo ""

# 显示 IAM 策略信息
echo "🔐 IAM 权限设置:"
echo "   如果遇到权限问题，请将以下策略附加到您的 IAM 用户:"
echo "   策略文件: /tmp/amplify-deploy-policy.json"
echo ""
echo "   或者运行以下命令创建并附加策略:"
echo "   aws iam create-policy --policy-name AmplifyDeployPolicy --policy-document file:///tmp/amplify-deploy-policy.json"
echo "   aws iam attach-user-policy --user-name YOUR_USERNAME --policy-arn arn:aws:iam::$ACCOUNT_ID:policy/AmplifyDeployPolicy"