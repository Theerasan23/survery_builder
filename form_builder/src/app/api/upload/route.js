import { NextResponse } from 'next/server';

const INTERNAL = process.env.INTERNAL_API_URL || 'http://localhost:3001/api';

export async function POST(request) {
    // Forward multipart form data to Express as-is
    const formData = await request.formData();
    const file = formData.get('image');

    if (!file) {
        return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Re-build FormData for the Express request
    const body = new FormData();
    body.append('image', file, file.name);

    const res = await fetch(`${INTERNAL}/upload`, {
        method: 'POST',
        body,
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
}
