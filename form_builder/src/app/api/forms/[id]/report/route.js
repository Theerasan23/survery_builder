import { NextResponse } from 'next/server';

const INTERNAL = process.env.INTERNAL_API_URL || 'http://localhost:3001/api';

export async function GET(request, { params }) {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from') || '';
    const to   = searchParams.get('to')   || '';

    const qs = new URLSearchParams();
    if (from) qs.set('from', from);
    if (to)   qs.set('to', to);

    const url = `${INTERNAL}/forms/${id}/report${qs.toString() ? '?' + qs.toString() : ''}`;
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
}
