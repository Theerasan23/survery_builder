import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { IBM_Plex_Sans_Thai } from 'next/font/google';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import LoginClient from './LoginClient';

const plexThai = IBM_Plex_Sans_Thai({
    subsets: ['thai', 'latin'],
    weight: ['400', '500', '600', '700'],
    display: 'swap',
});

const INTERNAL = process.env.INTERNAL_API_URL || 'http://localhost:3001/api';
const DEFAULT_REDIRECT = '/admin/dashboard';

async function getOrganization() {
    try {
        const res = await fetch(`${INTERNAL}/settings/organization`, { cache: 'no-store' });
        return await res.json();
    } catch {
        return {};
    }
}

// Serve the logo through the Next.js /api/uploads proxy, same as the settings page
function normalizeLogoUrl(url) {
    const match = typeof url === 'string' && url.match(/\/uploads\/[^?#]+$/);
    return match ? `/api${match[0]}` : null;
}

// Only same-site /admin paths are allowed, so ?callbackUrl= can't become an open redirect.
function safeCallbackUrl(value) {
    if (typeof value !== 'string') return DEFAULT_REDIRECT;
    try {
        const base = 'http://local.invalid';
        const url = new URL(value, base);
        if (url.origin !== base || !/^\/admin(\/|$)/.test(url.pathname)) return DEFAULT_REDIRECT;
        return url.pathname + url.search;
    } catch {
        return DEFAULT_REDIRECT;
    }
}

export default async function LoginPage({ searchParams }) {
    const { callbackUrl } = await searchParams;
    const redirectTo = safeCallbackUrl(callbackUrl);

    const session = await getServerSession(authOptions);
    if (session) redirect(redirectTo);

    const org = await getOrganization();
    return (
        <div className={plexThai.className}>
            <LoginClient
                systemName={org.system_name || 'Form Builder'}
                orgName={org.org_name || ''}
                logoUrl={normalizeLogoUrl(org.logo_url)}
                phone={org.phone || ''}
                lineId={org.line_id || ''}
                redirectTo={redirectTo}
            />
        </div>
    );
}
