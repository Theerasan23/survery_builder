export const dynamic = 'force-dynamic';

import { serverGetFormTopics } from '@/lib/serverApi';
import FormBuilderClient from './FormBuilderClient';

export default async function FormBuilderPage() {
    let topics = [];
    try {
        topics = await serverGetFormTopics();
    } catch (e) {
        console.error(e);
    }
    return <FormBuilderClient initialTopics={topics} />;
}
