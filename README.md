# 团队日历同步器

轻量级团队日历管理 PWA 应用，基于 Next.js 14 + AWS Amplify 构建，支持团队协作、事件管理和 iCalendar 订阅功能。

## 功能特性

- 🔐 **用户认证系统** - 支持邮箱注册、登录和密码重置
- 👥 **团队管理** - 多团队支持，角色权限控制
- 📅 **事件管理** - 创建、编辑、删除事件，支持多种视图
- 📱 **PWA 支持** - 可安装为独立应用，支持离线功能
- 🔗 **iCalendar 订阅** - 生成订阅链接，同步到个人日历应用
- 📱 **响应式设计** - 移动端优化，触摸友好的交互

## 技术栈

### 前端

- **Next.js 14** - 全栈 React 框架 (App Router)
- **TypeScript** - 类型安全
- **Tailwind CSS** - 样式框架
- **PWA** - 渐进式 Web 应用

### 后端

- **Next.js API Routes** - REST API
- **NextAuth.js** - 认证管理
- **AWS Cognito** - 用户身份服务
- **DynamoDB** - NoSQL 数据库

### 部署

- **AWS Amplify Hosting** - 静态网站托管
- **Amplify CI/CD** - 自动部署

## 快速开始

### 环境要求

- Node.js 18.17 或更高版本
- npm 或 yarn 包管理器

### 安装依赖

```bash
npm install
# 或
yarn install
```

### 环境配置

1. 复制环境变量模板：

```bash
cp .env.local.example .env.local
```

2. 编辑 `.env.local` 文件，填入相应的配置信息

### 开发服务器

```bash
npm run dev
# 或
yarn dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看应用。

### 构建生产版本

```bash
npm run build
npm run start
# 或
yarn build
yarn start
```

## 脚本命令

- `npm run dev` - 启动开发服务器
- `npm run build` - 构建生产版本
- `npm run start` - 启动生产服务器
- `npm run lint` - 运行 ESLint 检查
- `npm run lint:fix` - 自动修复 ESLint 问题
- `npm run format` - 格式化代码
- `npm run format:check` - 检查代码格式
- `npm run test` - 运行单元测试
- `npm run test:watch` - 监听模式运行测试
- `npm run test:coverage` - 生成测试覆盖率报告
- `npm run test:e2e` - 运行端到端测试

## 项目结构

```
├── src/
│   ├── app/                 # Next.js App Router 页面
│   ├── components/          # React 组件
│   │   ├── ui/             # 基础 UI 组件
│   │   └── ...             # 业务组件
│   ├── lib/                # 工具函数和配置
│   ├── types/              # TypeScript 类型定义
│   └── ...
├── public/                 # 静态资源
│   ├── icons/             # PWA 图标
│   └── manifest.json      # PWA 清单文件
├── tests/                 # 测试文件
│   ├── e2e/              # 端到端测试
│   └── ...
└── ...
```

## PWA 功能

应用支持 PWA 功能，包括：

- 📱 可安装为独立应用
- 🔄 Service Worker 缓存策略
- 📴 离线功能支持
- 🎨 自定义图标和启动画面
- ⚡ 快捷方式支持

## 开发指南

### 代码规范

项目使用 ESLint 和 Prettier 进行代码规范检查：

```bash
# 检查代码规范
npm run lint

# 自动修复问题
npm run lint:fix

# 格式化代码
npm run format
```

### 测试

项目包含单元测试和端到端测试：

```bash
# 运行单元测试
npm run test

# 运行端到端测试
npm run test:e2e

# 生成覆盖率报告
npm run test:coverage
```

## 部署

### AWS Amplify 部署

1. 连接 GitHub 仓库到 Amplify
2. 配置构建设置
3. 设置环境变量
4. 部署应用

详细部署指南请参考 [AWS Amplify 文档](https://docs.amplify.aws/)。

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License
