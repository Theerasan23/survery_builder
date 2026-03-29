import PersonnelDetailClient from './PersonnelDetailClient';

export default async function PersonnelDetailPage({ params, searchParams }) {
    const { id } = await params;
    const sp = await searchParams;
    return (
        <div className="p-6 max-w-5xl mx-auto">
            <PersonnelDetailClient
                personnelId={id}
                initialFrom={sp?.from || ''}
                initialTo={sp?.to || ''}
            />
        </div>
    );
}
