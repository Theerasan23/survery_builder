export const dynamic = 'force-dynamic';

import { serverGetForms } from '@/lib/serverApi';
import ManageFormsClient from './ManageFormsClient';

export default async function ManageFormsPage() {
    let forms = [];
    try { forms = await serverGetForms(); } catch (e) { console.error(e); }
    return <ManageFormsClient initialForms={forms} />;
}
