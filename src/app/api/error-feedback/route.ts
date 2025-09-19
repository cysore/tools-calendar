import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const feedback = await request.json();

    // 验证必需字段
    if (!feedback.description) {
      return NextResponse.json(
        { success: false, error: { message: '缺少问题描述' } },
        { status: 400 }
      );
    }

    // 记录错误反馈
    console.log('Error Feedback Received:', {
      timestamp: new Date().toISOString(),
      feedback,
      headers: {
        userAgent: request.headers.get('user-agent'),
        referer: request.headers.get('referer'),
        ip:
          request.headers.get('x-forwarded-for') ||
          request.headers.get('x-real-ip'),
      },
    });

    // 在生产环境中，这里应该：
    // 1. 保存到数据库
    // 2. 发送到错误监控服务（如 Sentry）
    // 3. 发送邮件通知给开发团队
    // 4. 创建工单或 GitHub Issue

    if (process.env.NODE_ENV === 'production') {
      // 示例：发送到外部服务
      try {
        // await sendToErrorTrackingService(feedback);
        // await notifyDevelopmentTeam(feedback);
      } catch (error) {
        console.error('Failed to process error feedback:', error);
      }
    }

    return NextResponse.json({
      success: true,
      message: '反馈已收到，感谢您的帮助',
    });
  } catch (error) {
    console.error('Error processing feedback:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          message: '处理反馈时出错，请稍后重试',
        },
      },
      { status: 500 }
    );
  }
}

// 获取错误反馈统计（仅开发环境）
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { success: false, error: { message: 'Not available in production' } },
      { status: 403 }
    );
  }

  // 在实际应用中，这里应该从数据库查询统计数据
  const mockStats = {
    totalFeedback: 42,
    recentFeedback: 7,
    resolvedIssues: 35,
    averageResponseTime: '2.3 hours',
    topIssues: [
      { issue: '网络连接问题', count: 15 },
      { issue: '页面加载缓慢', count: 12 },
      { issue: '登录失败', count: 8 },
      { issue: '数据同步错误', count: 7 },
    ],
  };

  return NextResponse.json({
    success: true,
    data: mockStats,
  });
}
