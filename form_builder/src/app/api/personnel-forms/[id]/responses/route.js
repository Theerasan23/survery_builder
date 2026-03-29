import { NextResponse } from 'next/server';

const INTERNAL = process.env.INTERNAL_API_URL || 'http://localhost:3001/api';

export async function POST(request, { params }) {
    const { id } = await params;
    const body = await request.json();
    const res = await fetch(`${INTERNAL}/personnel-forms/${id}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
}
