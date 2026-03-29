import JobPersonnelClient from './JobPersonnelClient';

export default async function JobPersonnelPage({ params, searchParams }) {
    const { jobId } = await params;
    const sp = await searchParams;
    return <JobPersonnelClient jobId={jobId} from={sp?.from || ''} to={sp?.to || ''} />;
}
