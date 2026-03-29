import { NextResponse } from 'next/server';

const INTERNAL = process.env.INTERNAL_API_URL || 'http://localhost:3001/api';

export async function PUT(request, { params }) {
    const { id } = await params;
    const body = await request.json();
    const res = await fetch(`${INTERNAL}/option-sets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
}

export async function DELETE(request, { params }) {
    const { id } = await params;
    const res = await fetch(`${INTERNAL}/option-sets/${id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
}
