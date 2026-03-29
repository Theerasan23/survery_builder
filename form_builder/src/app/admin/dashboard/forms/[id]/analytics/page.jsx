export const dynamic = 'force-dynamic';

import AnalyticsClient from './AnalyticsClient';

export default async function FormAnalyticsPage({ params }) {
    const { id } = await params;
    return <AnalyticsClient formId={id} />;
}
