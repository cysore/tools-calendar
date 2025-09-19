# AWS Amplify 部署配置

本项目已配置完整的 AWS Amplify 部署流程，支持自动化部署、自定义域名和 HTTPS 证书配置。

## 🚀 快速开始

### 1. 前置要求

确保已安装以下工具：

```bash
# 检查 Node.js 版本 (需要 18+)
node --version

# 安装 AWS CLI
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /

# 安装 Amplify CLI
npm install -g @aws-amplify/cli
```

### 2. AWS 配置

```bash
# 配置 AWS 凭证
aws configure

# 初始化 Amplify 项目
amplify init
```

### 3. 一键部署

```bash
# 部署到开发环境
npm run deploy:dev

# 部署到生产环境
npm run deploy:prod
```

## 📁 配置文件说明

### 核心配置文件

- `amplify.yml` - Amplify 构建配置
- `amplify/` - Amplify 项目配置目录
- `.env.example` - 环境变量模板
- `scripts/deploy.sh` - 部署脚本
- `scripts/setup-domain.sh` - 域名配置脚本
- `scripts/setup-env.sh` - 环境变量配置脚本

### 部署配置

```yaml
# amplify.yml
version: 1
applications:
  - appRoot: .
    frontend:
      phases:
        preBuild:
          commands:
            - npm ci
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: .next
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
          - .next/cache/**/*
```

## 🔧 环境配置

### 自动配置环境变量

```bash
# 生成开发环境配置
npm run setup:env dev

# 生成生产环境配置
npm run setup:env prod
```

### 手动配置

复制 `.env.example` 并根据你的 AWS 资源配置：

```bash
cp .env.example .env.local
```

必需的环境变量：

```env
# AWS 配置
AWS_REGION=us-east-1
COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
DYNAMODB_TABLE_NAME=teamcalendarsyncdb-dev

# NextAuth 配置
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-secret-key

# 应用配置
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## 🌐 自定义域名配置

### 使用脚本配置

```bash
# 配置自定义域名
npm run setup:domain your-domain.com
```

### 手动配置步骤

1. **添加域名到 Amplify**

   ```bash
   aws amplify create-domain-association \
     --app-id YOUR_APP_ID \
     --domain-name your-domain.com
   ```

2. **验证域名所有权**
   - 在 Amplify 控制台完成域名验证
   - 添加提供的 DNS TXT 记录

3. **配置 DNS 记录**

   ```
   Type: CNAME
   Name: www
   Value: d1234567890.cloudfront.net

   Type: CNAME
   Name: @
   Value: d1234567890.cloudfront.net
   ```

4. **等待 SSL 证书配置**
   - 自动配置 SSL 证书（24-48小时）
   - 完成后网站将通过 HTTPS 访问

## 🔄 CI/CD 配置

### GitHub Actions

项目包含完整的 GitHub Actions 工作流：

- **测试阶段**: 运行单元测试和代码检查
- **构建阶段**: 构建应用程序
- **部署阶段**: 自动部署到对应环境
- **E2E 测试**: 运行端到端测试

### 配置 GitHub Secrets

在 GitHub 仓库设置中添加以下 Secrets：

```
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AMPLIFY_APP_ID=your-app-id
DEV_APP_URL=https://dev.your-domain.com
PROD_APP_URL=https://your-domain.com
```

### 分支策略

- `develop` 分支 → 自动部署到开发环境
- `main` 分支 → 自动部署到生产环境
- Pull Request → 运行测试但不部署

## 📊 监控和维护

### 查看部署状态

```bash
# 查看 Amplify 状态
npm run amplify:status

# 打开 Amplify 控制台
npm run amplify:console
```

### 日志查看

在 AWS Amplify 控制台中可以查看：

- 构建日志
- 部署日志
- 访问日志
- 错误日志

### 性能监控

建议集成以下服务：

- **AWS CloudWatch** - 自动集成
- **Sentry** - 错误监控
- **Google Analytics** - 用户分析

## 🛠️ 故障排除

### 常见问题

#### 构建失败

```bash
# 本地测试构建
npm run build

# 检查构建日志
npm run amplify:console
```

#### 环境变量问题

```bash
# 重新生成环境变量
npm run setup:env prod

# 验证 Amplify 控制台中的环境变量
```

#### 域名配置问题

```bash
# 检查 DNS 配置
nslookup your-domain.com

# 验证 SSL 证书
curl -I https://your-domain.com
```

### 获取帮助

- [AWS Amplify 文档](https://docs.amplify.aws/)
- [部署详细指南](./docs/deployment.md)
- [AWS 支持中心](https://console.aws.amazon.com/support/)

## 💰 成本优化

### 免费套餐限制

AWS Amplify 免费套餐包括：

- 1000 分钟构建时间/月
- 5GB 存储空间
- 15GB 数据传输

### 优化建议

- 启用构建缓存减少构建时间
- 优化静态资源大小
- 使用 CDN 减少数据传输成本
- 设置 AWS 账单警报

## 🔒 安全最佳实践

### 环境变量安全

- 永远不要提交 `.env` 文件到版本控制
- 使用 AWS Systems Manager Parameter Store 存储敏感配置
- 定期轮换 API 密钥和令牌

### 访问控制

- 使用最小权限原则配置 IAM 角色
- 启用 MFA（多因素认证）
- 定期审查访问权限

### 数据保护

- 启用 DynamoDB 加密
- 强制使用 HTTPS
- 实施数据备份策略

---

通过以上配置，你的团队日历同步器应用将具备完整的 AWS Amplify 部署能力，支持自动化部署、自定义域名和生产级别的安全配置。
