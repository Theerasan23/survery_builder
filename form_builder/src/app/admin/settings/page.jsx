export const dynamic = 'force-dynamic';

import { getOrgSettings } from '@/lib/actions';
import OrgSettingsClient from './OrgSettingsClient';

export default async function OrgSettingsPage() {
    let settings = { system_name: '', org_name: '', logo_url: null };
    try { settings = await getOrgSettings(); } catch (e) { console.error(e); }
    return <OrgSettingsClient initialSettings={settings} />;
}
