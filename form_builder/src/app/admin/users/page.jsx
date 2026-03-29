export const dynamic = 'force-dynamic';

import { serverGetUsers } from '@/lib/serverApi';
import UsersClient from './UsersClient';

export default async function UsersManagementPage() {
    let users = [];
    try { users = await serverGetUsers(); } catch (e) { console.error(e); }
    return <UsersClient initialUsers={users} />;
}
