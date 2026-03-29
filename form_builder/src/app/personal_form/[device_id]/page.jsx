export const dynamic = 'force-dynamic';
import PersonalFormClient from './PersonalFormClient';

export default async function PersonalFormPage({ params }) {
    const { device_id } = await params;
    return <PersonalFormClient deviceId={device_id} />;
}
