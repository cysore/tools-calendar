import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { error } = await request.json();

    // 记录严重错误
    console.error('IMMEDIATE ERROR REPORT:', {
      timestamp: new Date().toISOString(),
      error,
      request: {
        userAgent: request.headers.get('user-agent'),
        referer: request.headers.get('referer'),
        ip:
          request.headers.get('x-forwarded-for') ||
          request.headers.get('x-real-ip'),
      },
    });

    // 在生产环境中处理严重错误
    if (process.env.NODE_ENV === 'production') {
      // 发送到错误监控服务
      try {
        // await sendToSentry(error);
        // await sendSlackAlert(error);
        // await createUrgentTicket(error);
      } catch (processingError) {
        console.error(
          'Failed to process immediate error report:',
          processingError
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing immediate report:', error);
    return NextResponse.json(
      { success: false, error: { message: 'Failed to process report' } },
      { status: 500 }
    );
  }
}
