export const dynamic = 'force-dynamic';

import DashboardClient from '@/components/admin/DashboardClient';
import { fetchDashboardStats } from './actions';

export default async function AdminIndex() {
    const toBKK = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
    const today = toBKK(new Date());

    // Default to "all data" so responses from previous months are not hidden by the date filter
    const initialData = await fetchDashboardStats('2020-01-01', today);

    return <DashboardClient initialData={initialData} />;
}
