#!/bin/bash

# 修复 AWS 权限问题
# Team Calendar Sync - Fix AWS Permissions

set -e

echo "🔐 修复 AWS 权限问题"
echo "==================="

# 获取当前用户信息
USER_ARN=$(aws sts get-caller-identity --query Arn --output text)
USER_NAME=$(echo "$USER_ARN" | cut -d'/' -f2)
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "👤 当前用户: $USER_NAME"
echo "🏢 账户 ID: $ACCOUNT_ID"
echo ""

# 创建 Amplify 完整权限策略
echo "📝 创建 Amplify 完整权限策略..."

cat > /tmp/amplify-full-policy.json << 'EOF'
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
                "apigateway:*",
                "route53:*",
                "acm:*",
                "cloudfront:*"
            ],
            "Resource": "*"
        }
    ]
}
EOF

# 检查策略是否已存在
POLICY_ARN="arn:aws:iam::$ACCOUNT_ID:policy/AmplifyFullAccessPolicy"
POLICY_EXISTS=$(aws iam get-policy --policy-arn "$POLICY_ARN" 2>/dev/null || echo "")

if [ -z "$POLICY_EXISTS" ]; then
    echo "🆕 创建新的 IAM 策略..."
    aws iam create-policy \
        --policy-name "AmplifyFullAccessPolicy" \
        --policy-document file:///tmp/amplify-full-policy.json \
        --description "Full access policy for Amplify deployment"
    
    echo "✅ IAM 策略创建成功"
else
    echo "✅ IAM 策略已存在"
fi

# 附加策略到用户
echo "🔗 附加策略到用户..."
aws iam attach-user-policy \
    --user-name "$USER_NAME" \
    --policy-arn "$POLICY_ARN" 2>/dev/null || echo "⚠️ 策略可能已经附加"

echo "✅ 策略附加完成"

# 验证权限
echo ""
echo "🧪 验证权限..."

# 测试 Amplify 权限
echo "📱 测试 Amplify 权限..."
aws amplify list-apps --region us-west-2 > /dev/null && echo "✅ Amplify 权限正常" || echo "❌ Amplify 权限不足"

# 测试 Route53 权限
echo "🌐 测试 Route53 权限..."
aws route53 list-hosted-zones > /dev/null && echo "✅ Route53 权限正常" || echo "❌ Route53 权限不足"

# 测试 Cognito 权限
echo "🔐 测试 Cognito 权限..."
aws cognito-idp list-user-pools --max-results 1 --region us-west-2 > /dev/null && echo "✅ Cognito 权限正常" || echo "❌ Cognito 权限不足"

# 测试 DynamoDB 权限
echo "🗄️ 测试 DynamoDB 权限..."
aws dynamodb list-tables --region us-west-2 > /dev/null && echo "✅ DynamoDB 权限正常" || echo "❌ DynamoDB 权限不足"

echo ""
echo "🎉 权限修复完成！"
echo ""
echo "📋 已创建的策略:"
echo "   - 策略名称: AmplifyFullAccessPolicy"
echo "   - 策略 ARN: $POLICY_ARN"
echo "   - 附加用户: $USER_NAME"
echo ""
echo "💡 如果仍有权限问题，请联系 AWS 管理员检查以下权限:"
echo "   - IAM 用户权限边界"
echo "   - 组织 SCP (Service Control Policies)"
echo "   - 资源级权限限制"