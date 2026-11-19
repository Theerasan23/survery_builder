import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

/**
 * Server-side only. Headers that let the Express API trust a request: the shared
 * INTERNAL_API_KEY plus the logged-in user's id from the NextAuth session.
 * Without a session no user id is sent and the API answers 401.
 */
export async function internalAuthHeaders() {
    const session = await getServerSession(authOptions);
    const headers = { 'X-Internal-Key': process.env.INTERNAL_API_KEY || '' };
    if (session?.user?.id) headers['X-User-Id'] = String(session.user.id);
    return headers;
}
