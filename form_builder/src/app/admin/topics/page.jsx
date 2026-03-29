export const dynamic = 'force-dynamic';

import { serverGetFormTopics } from '@/lib/serverApi';
import TopicsClient from './TopicsClient';

export default async function FormTopicsPage() {
    let topics = [];
    try { topics = await serverGetFormTopics(); } catch (e) { console.error(e); }
    return <TopicsClient initialTopics={topics} />;
}
