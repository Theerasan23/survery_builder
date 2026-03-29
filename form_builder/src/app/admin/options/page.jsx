export const dynamic = 'force-dynamic';

import { serverGetOptionSets } from '@/lib/serverApi';
import OptionsClient from './OptionsClient';

export default async function OptionSetsPage() {
    let optionSets = [];
    try { optionSets = await serverGetOptionSets(); } catch (e) { console.error(e); }
    return <OptionsClient initialOptionSets={optionSets} />;
}
