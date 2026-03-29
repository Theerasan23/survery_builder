import { NextResponse } from 'next/server';

const INTERNAL = process.env.INTERNAL_API_URL || 'http://localhost:3001/api';

export async function GET(request, { params }) {
    const { topicId } = await params;
    const { searchParams } = new URL(request.url);
    const qs = searchParams.toString();
    const res = await fetch(`${INTERNAL}/forms/topic-analytics/${topicId}${qs ? `?${qs}` : ''}`, { cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
}
