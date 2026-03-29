import LoginClient from './LoginClient';

const INTERNAL = process.env.INTERNAL_API_URL || 'http://localhost:3001/api';

async function getSystemName() {
    try {
        const res = await fetch(`${INTERNAL}/settings/organization`, { cache: 'no-store' });
        const data = await res.json();
        return data.system_name || 'Form Builder';
    } catch {
        return 'Form Builder';
    }
}

export default async function LoginPage() {
    const systemName = await getSystemName();
    return <LoginClient systemName={systemName} />;
}
