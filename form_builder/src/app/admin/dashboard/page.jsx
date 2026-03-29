export const dynamic = 'force-dynamic';

import DashboardClient from '@/components/admin/DashboardClient';
import { fetchDashboardStats } from './actions';

export default async function AdminIndex() {
    const toBKK = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
    const today = toBKK(new Date());
    const firstOfMonth = today.slice(0, 8) + '01';

    const initialData = await fetchDashboardStats(firstOfMonth, today);

    return <DashboardClient initialData={initialData} />;
}
