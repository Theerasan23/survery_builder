'use server';

const INTERNAL_URL = process.env.INTERNAL_API_URL || 'http://localhost:3001/api';

async function apiFetch(path, options = {}) {
    const res = await fetch(`${INTERNAL_URL}${path}`, {
        ...options,
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
}

// ─── Organization Settings ───
export async function getOrgSettings() {
    const { data } = await apiFetch('/settings/organization');
    return data || { system_name: '', org_name: '', logo_url: null };
}

export async function saveOrgSettings(settings) {
    return apiFetch('/settings/organization', {
        method: 'PUT',
        body: JSON.stringify(settings),
    });
}

export async function uploadImage(formData) {
    const res = await fetch(`${INTERNAL_URL.replace('/api', '')}/api/upload`, {
        method: 'POST',
        body: formData,
        cache: 'no-store',
    });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, data };
}

// ─── Option Sets ───
export async function getOptionSets() {
    const { data } = await apiFetch('/option-sets');
    return data || [];
}

export async function createOptionSet(payload) {
    return apiFetch('/option-sets', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export async function updateOptionSet(id, payload) {
    return apiFetch(`/option-sets/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
}

export async function deleteOptionSet(id) {
    return apiFetch(`/option-sets/${id}`, { method: 'DELETE' });
}

// ─── Form Topics ───
export async function getFormTopics() {
    const { data } = await apiFetch('/form-topics');
    return data || [];
}

export async function createFormTopic(payload) {
    return apiFetch('/form-topics', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export async function updateFormTopic(id, payload) {
    return apiFetch(`/form-topics/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
}

export async function deleteFormTopic(id) {
    return apiFetch(`/form-topics/${id}`, { method: 'DELETE' });
}

// ─── Users ───
export async function getUsers() {
    const { data } = await apiFetch('/users');
    return data || [];
}

export async function createUser(payload) {
    return apiFetch('/users', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export async function updateUser(id, payload) {
    return apiFetch(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
}

// ─── Forms ───
export async function getFormById(id) {
    const { ok, data } = await apiFetch(`/forms/${id}`);
    if (!ok) throw new Error(data?.error || 'โหลดแบบฟอร์มไม่สำเร็จ');
    return data;
}

export async function createForm(payload) {
    return apiFetch('/forms', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export async function updateForm(id, payload) {
    return apiFetch(`/forms/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
}

// ─── Form Management ───
export async function toggleFormActive(id) {
    return apiFetch(`/forms/${id}/toggle-active`, { method: 'PATCH' });
}

export async function deleteForm(id) {
    return apiFetch(`/forms/${id}`, { method: 'DELETE' });
}

export async function duplicateForm(id) {
    return apiFetch(`/forms/${id}/duplicate`, { method: 'POST' });
}

export async function getFormReport(formId, from, to) {
    const qs = new URLSearchParams();
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    const { ok, data } = await apiFetch(`/forms/${formId}/report?${qs}`);
    if (!ok) throw new Error(data?.error || 'โหลดรายงานไม่สำเร็จ');
    return data;
}

export async function getFormAnalytics(formId, from, to) {
    const qs = new URLSearchParams();
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    const { ok, data } = await apiFetch(`/forms/${formId}/questions-analytics?${qs}`);
    if (!ok) throw new Error(data?.error || 'โหลดข้อมูลไม่สำเร็จ');
    return data;
}

// ─── Form Responses ───
export async function submitFormResponse(uuid, answers) {
    return apiFetch(`/forms/${uuid}/responses`, {
        method: 'POST',
        body: JSON.stringify({ answers }),
    });
}

// ─── Topic Analytics ───
export async function getTopicAnalytics(topicId, from, to, formIds) {
    const qs = new URLSearchParams();
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    if (formIds && formIds.length > 0) qs.set('formIds', formIds.join(','));
    const { ok, data } = await apiFetch(`/forms/topic-analytics/${topicId}?${qs}`);
    if (!ok) throw new Error('โหลดข้อมูลไม่สำเร็จ');
    return data;
}
