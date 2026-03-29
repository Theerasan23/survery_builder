import { NextResponse } from 'next/server';

const INTERNAL = process.env.INTERNAL_API_URL || 'http://localhost:3001/api';

export async function PATCH(request, { params }) {
    const { id } = await params;
    const res = await fetch(`${INTERNAL}/forms/${id}/toggle-active`, { method: 'PATCH' });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
}
