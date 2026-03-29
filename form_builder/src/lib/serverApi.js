/**
 * Server-side only API functions.
 * ใช้ INTERNAL_API_URL เพื่อ fetch จาก server โดยตรง ไม่ผ่าน browser (ไม่มีปัญหา CORS)
 */
const INTERNAL_URL = process.env.INTERNAL_API_URL || 'http://localhost:3001/api';

async function apiFetch(path, options = {}) {
    const res = await fetch(`${INTERNAL_URL}${path}`, {
        ...options,
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`API ${options.method || 'GET'} ${path} failed (${res.status}): ${text}`);
    }
    return res.json();
}

export const serverGetForms          = ()         => apiFetch('/forms');
export const serverGetFormById       = (id)       => apiFetch(`/forms/${id}`);
export const serverGetFormTopics     = ()         => apiFetch('/form-topics');
export const serverGetOptionSets     = ()         => apiFetch('/option-sets');
export const serverGetUsers          = ()         => apiFetch('/users');
export const serverGetAnalytics      = (id)       => apiFetch(`/forms/${id}/questions-analytics`);
export const serverGetResponsesDetail = (id)      => apiFetch(`/forms/${id}/responses-detail`);
