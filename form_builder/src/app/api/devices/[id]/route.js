import { NextResponse } from 'next/server';

const INTERNAL = process.env.INTERNAL_API_URL || 'http://localhost:3001/api';

export async function GET(request, { params }) {
    const { id } = await params;
    const res = await fetch(`${INTERNAL}/devices/${id}`, { cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
}

export async function PATCH(request, { params }) {
    const { id } = await params;
    const body = await request.json();
    const res = await fetch(`${INTERNAL}/devices/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
}
