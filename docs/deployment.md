# AWS Amplify 部署指南

本文档详细说明如何将团队日历同步器部署到 AWS Amplify。

## 前置要求

### 1. 安装必要工具

```bash
# 安装 AWS CLI
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /

# 安装 Amplify CLI
npm install -g @aws-amplify/cli

# 验证安装
aws --version
amplify --version
```

### 2. 配置 AWS 凭证

```bash
# 配置 AWS CLI
aws configure

# 输入以下信息：
# AWS Access Key ID: 你的访问密钥
# AWS Secret Access Key: 你的秘密访问密钥
# Default region name: us-east-1
# Default output format: json
```

### 3. 初始化 Amplify 项目

```bash
# 在项目根目录运行
amplify init

# 选择以下配置：
# Project name: teamcalendarsync
# Environment name: dev
# Default editor: Visual Studio Code
# App type: javascript
# Framework: react
# Source Directory Path: src
# Distribution Directory Path: .next
# Build Command: npm run build
# Start Command: npm run dev
```

## 部署步骤

### 1. 快速部署

使用提供的部署脚本：

```bash
# 部署到开发环境
./scripts/deploy.sh dev

# 部署到生产环境
./scripts/deploy.sh prod
```

### 2. 手动部署

#### 步骤 1: 添加认证服务

```bash
amplify add auth

# 选择配置：
# Do you want to use the default authentication and security configuration? Default configuration
# How do you want users to be able to sign in? Email
# Do you want to configure advanced settings? No, I am done.
```

#### 步骤 2: 添加存储服务

```bash
amplify add storage

# 选择配置：
# Select from one of the below mentioned services: NoSQL Database
# Provide a friendly name for your resource: teamcalendarsyncdb
# Provide table name: teamcalendarsyncdb
# What would you like to name this column: PK
# Please choose the data type: string
# Would you like to add another column? Yes
# What would you like to name this column: SK
# Please choose the data type: string
# Would you like to add another column? Yes
# What would you like to name this column: GSI1PK
# Please choose the data type: string
# Would you like to add another column? Yes
# What would you like to name this column: GSI1SK
# Please choose the data type: string
# Would you like to add another column? No
# Please choose partition key for the table: PK
# Do you want to add a sort key to your table? Yes
# Please choose sort key for the table: SK
# Do you want to add global secondary indexes to your table? Yes
# Please provide the GSI name: GSI1
# Please choose partition key for the GSI: GSI1PK
# Do you want to add a sort key to your GSI? Yes
# Please choose sort key for the GSI: GSI1SK
# Do you want to add more global secondary indexes to your table? No
```

#### 步骤 3: 添加托管服务

```bash
amplify add hosting

# 选择配置：
# Select the plugin module to execute: Hosting with Amplify Console
# Choose a type: Continuous deployment (Git-based deployments)
```

#### 步骤 4: 部署所有服务

```bash
amplify push

# 确认部署：
# Are you sure you want to continue? Yes
# Do you want to generate code for your newly created GraphQL API? No
```

### 3. 环境变量配置

#### 自动配置

```bash
# 使用脚本自动生成环境变量
./scripts/setup-env.sh dev
./scripts/setup-env.sh prod
```

#### 手动配置

在 Amplify 控制台中设置环境变量：

1. 打开 [AWS Amplify 控制台](https://console.aws.amazon.com/amplify/)
2. 选择你的应用
3. 点击 "Environment variables"
4. 添加以下变量：

```
NEXTAUTH_SECRET=your-generated-secret
JWT_SECRET=your-generated-jwt-secret
ENCRYPTION_KEY=your-generated-encryption-key
NODE_ENV=production
NEXT_PUBLIC_ENABLE_PWA=true
NEXT_PUBLIC_ENABLE_OFFLINE=true
```

## 自定义域名配置

### 1. 使用脚本配置

```bash
# 配置自定义域名
./scripts/setup-domain.sh your-domain.com
```

### 2. 手动配置

#### 步骤 1: 添加域名

1. 在 Amplify 控制台中，选择你的应用
2. 点击 "Domain management"
3. 点击 "Add domain"
4. 输入你的域名（例如：example.com）
5. 配置子域名：
   - `www.example.com` → `main` 分支
   - `example.com` → `main` 分支

#### 步骤 2: 验证域名所有权

1. 按照控制台提供的说明验证域名所有权
2. 通常需要添加 DNS TXT 记录

#### 步骤 3: 配置 DNS

1. 在你的域名提供商处添加 CNAME 记录：
   ```
   www.example.com → d1234567890.cloudfront.net
   example.com → d1234567890.cloudfront.net
   ```

#### 步骤 4: 等待 SSL 证书

- SSL 证书自动配置可能需要 24-48 小时
- 证书配置完成后，你的网站将通过 HTTPS 访问

### 3. 更新环境变量

域名配置完成后，更新以下环境变量：

```bash
NEXTAUTH_URL=https://your-domain.com
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_API_URL=https://your-domain.com/api
```

## 持续集成/持续部署 (CI/CD)

### 1. Git 集成

Amplify 支持与 GitHub、GitLab、Bitbucket 等 Git 仓库集成：

1. 在 Amplify 控制台中连接你的 Git 仓库
2. 选择要部署的分支（通常是 `main` 或 `master`）
3. 配置构建设置（使用项目根目录的 `amplify.yml`）

### 2. 自动部署

配置完成后，每次推送到指定分支都会触发自动部署：

```bash
# 推送代码触发部署
git add .
git commit -m "Update application"
git push origin main
```

### 3. 构建配置

项目包含的 `amplify.yml` 文件定义了构建过程：

```yaml
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

## 监控和维护

### 1. 查看部署状态

```bash
# 查看当前状态
amplify status

# 查看部署历史
amplify console
```

### 2. 日志查看

在 Amplify 控制台中可以查看：

- 构建日志
- 部署日志
- 访问日志

### 3. 性能监控

建议集成以下监控服务：

- AWS CloudWatch（自动集成）
- Sentry（错误监控）
- Google Analytics（用户分析）

## 故障排除

### 常见问题

#### 1. 构建失败

```bash
# 检查构建日志
amplify console

# 本地测试构建
npm run build
```

#### 2. 环境变量问题

```bash
# 重新生成环境变量
./scripts/setup-env.sh prod

# 在 Amplify 控制台中验证环境变量
```

#### 3. 域名配置问题

```bash
# 检查 DNS 配置
nslookup your-domain.com

# 验证 SSL 证书
openssl s_client -connect your-domain.com:443
```

#### 4. 权限问题

确保 AWS IAM 用户具有以下权限：

- AmplifyFullAccess
- CloudFormationFullAccess
- IAMFullAccess
- S3FullAccess
- CognitoIdentityProviderFullAccess
- DynamoDBFullAccess

### 获取帮助

- [AWS Amplify 文档](https://docs.amplify.aws/)
- [Amplify CLI 文档](https://docs.amplify.aws/cli/)
- [AWS 支持中心](https://console.aws.amazon.com/support/)

## 成本优化

### 1. 免费套餐

AWS Amplify 提供慷慨的免费套餐：

- 1000 分钟构建时间/月
- 5GB 存储
- 15GB 数据传输

### 2. 成本监控

- 在 AWS 控制台中设置账单警报
- 定期检查 AWS Cost Explorer
- 使用 AWS Budgets 设置预算

### 3. 优化建议

- 启用缓存以减少构建时间
- 优化图片和静态资源
- 使用 CDN 减少数据传输成本

## 安全最佳实践

### 1. 环境变量安全

- 永远不要在代码中硬编码敏感信息
- 使用 AWS Systems Manager Parameter Store 存储敏感配置
- 定期轮换密钥和令牌

### 2. 访问控制

- 使用最小权限原则配置 IAM 角色
- 启用 MFA（多因素认证）
- 定期审查访问权限

### 3. 数据保护

- 启用 DynamoDB 加密
- 使用 HTTPS 强制加密传输
- 实施适当的数据备份策略

---

通过遵循本指南，你应该能够成功将团队日历同步器部署到 AWS Amplify，并配置自定义域名和 HTTPS 证书。如有问题，请参考故障排除部分或联系 AWS 支持。
