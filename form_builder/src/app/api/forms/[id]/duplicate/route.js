import { NextResponse } from 'next/server';

const INTERNAL = process.env.INTERNAL_API_URL || 'http://localhost:3001/api';

export async function POST(request, { params }) {
    const { id } = await params;
    const res = await fetch(`${INTERNAL}/forms/${id}/duplicate`, { method: 'POST' });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
}
