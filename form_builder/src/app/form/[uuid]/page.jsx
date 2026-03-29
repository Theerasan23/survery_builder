export const dynamic = 'force-dynamic';

import { serverGetFormById } from '@/lib/serverApi';
import { getOrgSettings } from '@/lib/actions';
import FormClient from './FormClient';

export default async function FormPage({ params }) {
    const { uuid } = await params;
    let form = null;
    let error = null;
    let orgSettings = { org_name: '', logo_url: null };

    try {
        [form, orgSettings] = await Promise.all([
            serverGetFormById(uuid),
            getOrgSettings(),
        ]);
    } catch (e) {
        console.error(e);
        if (!form) error = 'ไม่พบแบบฟอร์มหรือเกิดข้อผิดพลาด';
    }

    return <FormClient uuid={uuid} initialForm={form} initialError={error} initialOrgSettings={orgSettings} />;
}
