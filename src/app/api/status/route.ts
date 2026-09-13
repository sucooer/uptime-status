import { NextResponse } from 'next/server';
import { getStatus } from '@/lib/uptimerobot';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/** 对外暴露 JSON 状态数据，方便二次集成（Grafana、钉钉/飞书机器人等） */
export async function GET() {
  const data = await getStatus();
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
