'use server';

const INTERNAL = process.env.INTERNAL_API_URL || 'http://localhost:3001/api';

export async function fetchDashboardStats(from, to) {
    try {
        const qs = new URLSearchParams();
        if (from) qs.set('from', from);
        if (to) qs.set('to', to);
        const res = await fetch(`${INTERNAL}/forms/dashboard-stats${qs.toString() ? `?${qs}` : ''}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to fetch');
        return await res.json();
    } catch (error) {
        console.error('Dashboard stats fetch error:', error);
        return null;
    }
}

export async function fetchForms() {
    try {
        const res = await fetch(`${INTERNAL}/forms`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to fetch');
        return await res.json();
    } catch (error) {
        console.error('Forms fetch error:', error);
        return null;
    }
}
