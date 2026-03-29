import { NextResponse } from 'next/server';

const INTERNAL = process.env.INTERNAL_API_URL || 'http://localhost:3001/api';

export async function GET(request, { params }) {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const query = searchParams.toString();
    const url = `${INTERNAL}/personnel/${id}/responses${query ? '?' + query : ''}`;
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
}
