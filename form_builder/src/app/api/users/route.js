import { NextResponse } from 'next/server';
import { internalAuthHeaders } from '@/lib/internalAuth';

const INTERNAL = process.env.INTERNAL_API_URL || 'http://localhost:3001/api';

export async function GET() {
    const res = await fetch(`${INTERNAL}/users`, { cache: 'no-store', headers: await internalAuthHeaders() });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
}

export async function POST(request) {
    const body = await request.json();
    const res = await fetch(`${INTERNAL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await internalAuthHeaders()) },
        body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
}
