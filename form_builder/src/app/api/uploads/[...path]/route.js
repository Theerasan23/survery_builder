import { NextResponse } from 'next/server';

const INTERNAL = (process.env.INTERNAL_API_URL || 'http://localhost:3001/api').replace('/api', '');

export async function GET(request, { params }) {
    const { path } = await params;
    const filePath = Array.isArray(path) ? path.join('/') : path;

    try {
        const res = await fetch(`${INTERNAL}/uploads/${filePath}`, { cache: 'no-store' });
        if (!res.ok) return new NextResponse('Not found', { status: 404 });

        const buffer = await res.arrayBuffer();
        const contentType = res.headers.get('content-type') || 'application/octet-stream';

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400',
            },
        });
    } catch {
        return new NextResponse('Error fetching file', { status: 500 });
    }
}
