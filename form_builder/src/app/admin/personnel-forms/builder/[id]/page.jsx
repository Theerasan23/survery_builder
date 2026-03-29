import PersonnelFormBuilderClient from './PersonnelFormBuilderClient';

export default async function PersonnelFormBuilderPage({ params }) {
    const { id } = await params;
    return <PersonnelFormBuilderClient formId={id} />;
}
