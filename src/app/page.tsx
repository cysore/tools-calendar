import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '首页',
  description: '团队日历同步器 - 轻量级团队日历管理 PWA 应用',
};

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl mx-auto text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
            团队日历同步器
          </h1>
          <p className="text-xl text-muted-foreground">
            轻量级团队日历管理 PWA 应用
          </p>
          <p className="text-lg text-muted-foreground">
            支持团队协作、事件管理和 iCalendar 订阅功能
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/auth/register"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            开始使用
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
          >
            登录
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
            <h3 className="text-lg font-semibold mb-2">团队协作</h3>
            <p className="text-muted-foreground">
              支持多团队管理，角色权限控制，邀请成员协作
            </p>
          </div>
          <div className="p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
            <h3 className="text-lg font-semibold mb-2">事件管理</h3>
            <p className="text-muted-foreground">
              创建、编辑、删除事件，支持多种视图和分类筛选
            </p>
          </div>
          <div className="p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
            <h3 className="text-lg font-semibold mb-2">iCalendar 订阅</h3>
            <p className="text-muted-foreground">
              生成订阅链接，同步到个人日历应用，支持导出功能
            </p>
          </div>
        </div>

        <div className="mt-12 p-4 rounded-lg bg-muted">
          <p className="text-sm text-muted-foreground">
            🚀 项目初始化完成！Next.js 14 + TypeScript + Tailwind CSS + PWA
            配置已就绪
          </p>
        </div>
      </div>
    </main>
  );
}
