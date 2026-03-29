export const dynamic = 'force-dynamic';

import { serverGetForms } from '@/lib/serverApi';
import ReportsClient from './ReportsClient';

export default async function ReportsPage() {
    let forms = [];
    try { forms = await serverGetForms(); } catch (e) { console.error(e); }
    return <ReportsClient forms={forms} />;
}
