import { serverGetFormTopics } from '@/lib/serverApi';
import FormBuilderClient from '../FormBuilderClient';

export default async function EditFormPage({ params }) {
    const { id } = await params;
    let topics = [];
    try {
        topics = await serverGetFormTopics();
    } catch (e) {
        console.error(e);
    }
    return <FormBuilderClient editId={id} initialTopics={topics} />;
}
