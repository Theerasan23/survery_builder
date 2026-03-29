export const dynamic = 'force-dynamic';
import TopicAnalyticsClient from './TopicAnalyticsClient';

export default async function TopicAnalyticsPage({ params }) {
    const { topicId } = await params;
    return <TopicAnalyticsClient topicId={topicId} />;
}
