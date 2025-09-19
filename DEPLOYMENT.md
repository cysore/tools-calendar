# Team Calendar Sync - 部署指南

## 🚀 快速部署

### 1. 环境准备

```bash
# 安装依赖
npm install

# 配置 AWS CLI
aws configure
```

### 2. AWS 资源设置

```bash
# 运行 AWS 环境设置脚本
./scripts/setup-aws-simple.sh

# 配置使用默认域名
./scripts/use-default-domain.sh
```

### 3. 部署监控

```bash
# 检查部署状态
./scripts/check-deployment.sh
```

## 📋 环境配置

### 生产环境配置

1. 复制环境模板：
```bash
cp .env.production.template .env.production
```

2. 填入实际的配置值：
- `NEXTAUTH_URL`: Amplify 应用的默认域名
- `COGNITO_*`: Cognito 用户池配置
- `DYNAMODB_TABLE_NAME`: DynamoDB 表名
- 其他密钥和配置

### 开发环境配置

```bash
cp .env.example .env.local
# 编辑 .env.local 填入开发环境配置
```

## 🔗 重要链接

- **应用 URL**: https://d2f3c99j7qplzg.amplifyapp.com
- **Amplify 控制台**: https://console.aws.amazon.com/amplify/home?region=us-west-2#/d2f3c99j7qplzg
- **DynamoDB 控制台**: https://console.aws.amazon.com/dynamodbv2/home?region=us-west-2#tables
- **Cognito 控制台**: https://console.aws.amazon.com/cognito/home?region=us-west-2

## 🛠️ 可用脚本

| 脚本 | 描述 |
|------|------|
| `setup-aws-simple.sh` | 设置 AWS 基础资源 |
| `use-default-domain.sh` | 配置使用 Amplify 默认域名 |
| `check-deployment.sh` | 检查部署状态 |
| `setup-github-amplify.sh` | 连接 GitHub 仓库 |
| `fix-permissions.sh` | 修复 AWS 权限问题 |

## 🔐 安全注意事项

- ✅ 所有敏感配置文件已添加到 `.gitignore`
- ✅ 使用环境变量管理敏感信息
- ✅ 生产环境使用 HTTPS
- ✅ Cognito 提供用户认证和授权
- ✅ DynamoDB 数据加密

## 📝 部署流程

1. **代码推送**: 推送到 `main` 分支自动触发部署
2. **构建过程**: Amplify 自动构建 Next.js 应用
3. **部署完成**: 应用自动部署到默认域名
4. **健康检查**: 验证应用功能正常

## 🐛 故障排除

### 部署失败
```bash
# 查看部署日志
aws amplify get-job --app-id d2f3c99j7qplzg --branch-name main --job-id <JOB_ID> --region us-west-2
```

### 权限问题
```bash
# 修复 AWS 权限
./scripts/fix-permissions.sh
```

### 环境变量问题
- 检查 `.env.production` 文件配置
- 确保所有必需的环境变量都已设置
- 验证 Cognito 和 DynamoDB 配置

## 📊 监控和日志

- **应用监控**: Amplify 控制台提供构建和部署日志
- **错误追踪**: 应用内置错误监控和报告
- **性能监控**: 生产环境性能指标收集