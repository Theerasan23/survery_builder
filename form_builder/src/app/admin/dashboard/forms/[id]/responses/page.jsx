export const dynamic = 'force-dynamic';

import { serverGetResponsesDetail, serverGetFormById } from '@/lib/serverApi';
import ResponsesClient from './ResponsesClient';

export default async function FormResponsesPage({ params }) {
    const { id } = await params;
    let data = null;
    let formTitle = '';

    try {
        const [detail, form] = await Promise.all([
            serverGetResponsesDetail(id),
            serverGetFormById(id)
        ]);
        data = detail;
        formTitle = form.title;
    } catch (e) {
        console.error(e);
    }

    if (!data) {
        return <div className="text-red-500 text-center p-8 bg-red-50 dark:bg-red-900/10 rounded-none">ไม่สามารถโหลดข้อมูลได้</div>;
    }

    return <ResponsesClient id={id} data={data} formTitle={formTitle} />;
}
