import { NextResponse } from 'next/server';

const INTERNAL = process.env.INTERNAL_API_URL || 'http://localhost:3001/api';

export async function GET(request, { params }) {
    const { id } = await params;
    const res = await fetch(`${INTERNAL}/forms/${id}/responses-detail`, { cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
}
