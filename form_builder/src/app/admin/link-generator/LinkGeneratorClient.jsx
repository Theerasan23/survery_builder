'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Link2, Copy, Check, Power, PowerOff, User, ChevronDown, Eye, Briefcase } from 'lucide-react';
import axios from 'axios';
import { io } from 'socket.io-client';

const API = process.env.NEXT_PUBLIC_API_URL;
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;
const BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

function timeAgo(dateStr) {
    if (!dateStr) return null;
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return `${diff} วินาทีที่แล้ว`;
    if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ชั่วโมงที่แล้ว`;
    return `${Math.floor(diff / 86400)} วันที่แล้ว`;
}

export default function LinkGeneratorClient() {
    const [devices, setDevices] = useState([]);
    const [personnelList, setPersonnelList] = useState([]);
    const [jobTypes, setJobTypes] = useState([]);
    const [selectedJobs, setSelectedJobs] = useState({}); // { deviceId: jobId }
    const [loading, setLoading] = useState(true);
    const [copiedId, setCopiedId] = useState(null);
    const [updatingId, setUpdatingId] = useState(null);
    const [liveOpenedIds, setLiveOpenedIds] = useState(new Set()); // devices currently being viewed
    const socketRef = useRef(null);

    const fetchAll = useCallback(async () => {
        try {
            const [dRes, jRes] = await Promise.all([
                axios.get(`${API}/devices`),
                axios.get(`${API}/job-types`)
            ]);
            setDevices(dRes.data);
            setJobTypes(jRes.data);
            // Init selectedJobs from device's current job_id
            const initJobs = {};
            dRes.data.forEach(d => { if (d.job_id) initJobs[d.id] = String(d.job_id); });
            setSelectedJobs(initJobs);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Tick every 30s to refresh "X นาทีที่แล้ว" labels
    useEffect(() => {
        const timer = setInterval(() => setDevices(d => [...d]), 30000);
        return () => clearInterval(timer);
    }, []);

    // Socket.io: listen for device_link_opened events
    useEffect(() => {
        if (!SOCKET_URL) return;
        const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'], reconnectionAttempts: 3 });
        socketRef.current = socket;

        socket.on('device_link_opened', ({ device_id, opened_at }) => {
            // Update last_opened_at in local state
            setDevices(prev => prev.map(d =>
                d.id === device_id ? { ...d, last_opened_at: opened_at } : d
            ));
            // Show live "กำลังดูอยู่" badge for 10 seconds
            setLiveOpenedIds(prev => new Set([...prev, device_id]));
            setTimeout(() => {
                setLiveOpenedIds(prev => { const n = new Set(prev); n.delete(device_id); return n; });
            }, 10000);
        });

        return () => socket.disconnect();
    }, []);

    const getLink = (deviceId) => `${BASE_URL}/personal_form/${deviceId}`;

    const copyLink = async (deviceId) => {
        try {
            await navigator.clipboard.writeText(getLink(deviceId));
            setCopiedId(deviceId);
            setTimeout(() => setCopiedId(null), 2000);
        } catch { /* ignore */ }
    };

    const assignPersonnel = async (device, personnelId) => {
        const jobId = selectedJobs[device.id] || null;
        setUpdatingId(device.id);
        try {
            const isAssigning = Boolean(personnelId);
            await axios.patch(`${API}/devices/${device.id}/status`, {
                status: isAssigning ? 'open' : 'closed',
                personnel_id: personnelId || null,
                job_id: isAssigning ? (jobId || null) : null
            });
            setDevices(prev => prev.map(d =>
                d.id === device.id
                    ? {
                        ...d,
                        personnel_id: personnelId || null,
                        job_id: isAssigning ? (jobId ? parseInt(jobId) : null) : null,
                        status: isAssigning ? 'open' : 'closed',
                        personnel_name: isAssigning
                            ? (() => {
                                const p = personnelList.find(p => String(p.id) === String(personnelId));
                                return p ? `${p.first_name} ${p.last_name}` : null;
                            })()
                            : null,
                        job_name: isAssigning && jobId ? (jobTypes.find(j => String(j.id) === String(jobId))?.name || null) : null
                    }
                    : d
            ));
        } catch (err) {
            alert('เกิดข้อผิดพลาด: ' + (err.response?.data?.error || err.message));
        } finally {
            setUpdatingId(null);
        }
    };

    const assignJob = async (device, jobId) => {
        setSelectedJobs(prev => ({ ...prev, [device.id]: jobId }));
        // If device is already open (personnel selected), also update job in db
        if (device.status === 'open' && device.personnel_id) {
            try {
                await axios.patch(`${API}/devices/${device.id}/status`, {
                    status: 'open',
                    personnel_id: device.personnel_id,
                    job_id: jobId || null
                });
                setDevices(prev => prev.map(d =>
                    d.id === device.id
                        ? { ...d, job_id: jobId ? parseInt(jobId) : null, job_name: jobId ? (jobTypes.find(j => String(j.id) === String(jobId))?.name || null) : null }
                        : d
                ));
            } catch (err) {
                console.error(err);
            }
        }
    };

    const toggleStatus = async (device) => {
        const newStatus = device.status === 'open' ? 'closed' : 'open';
        setUpdatingId(device.id);
        try {
            await axios.patch(`${API}/devices/${device.id}/status`, { status: newStatus });
            setDevices(prev => prev.map(d => d.id === device.id ? { ...d, status: newStatus } : d));
        } catch (err) {
            alert('เกิดข้อผิดพลาด');
        } finally {
            setUpdatingId(null);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center py-32">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white dark:bg-neutral-900 rounded-none shadow-sm border border-neutral-200 dark:border-neutral-800 p-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-none">
                        <Link2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">อุปกรณ์และแบบประเมิน</h2>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            ให้เลือกเจ้าหน้าที่ในอุปกรณ์นั้นๆ เพื่อส่งแบบการประเมิน
                        </p>
                    </div>
                </div>
            </div>

            {devices.length === 0 ? (
                <div className="bg-white dark:bg-neutral-900 rounded-none border border-neutral-200 dark:border-neutral-800 flex flex-col items-center justify-center py-20 text-neutral-400">
                    <Link2 className="w-14 h-14 mb-3 opacity-30" />
                    <p className="font-medium">ยังไม่มี Device</p>
                    <p className="text-sm mt-1">ไปที่หน้า "อุปกรณ์" เพื่อสร้าง Device ก่อน</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {devices.map(device => {
                        const isOpen = device.status === 'open';
                        const isUpdating = updatingId === device.id;
                        const link = getLink(device.id);

                        const isLive = liveOpenedIds.has(device.id);
                        const lastOpened = timeAgo(device.last_opened_at);

                        return (
                            <div
                                key={device.id}
                                className={`relative bg-white dark:bg-neutral-900 rounded-none shadow-sm border transition-all duration-300 overflow-hidden ${isOpen ? 'border-emerald-200 dark:border-emerald-800 shadow-emerald-100 dark:shadow-emerald-900/20' : 'border-neutral-200 dark:border-neutral-800'}`}
                            >
                                {/* Status strip */}
                                <div className={`h-1 w-full transition-colors duration-300 ${isOpen ? 'bg-gradient-to-r from-emerald-400 to-teal-400' : 'bg-neutral-200 dark:bg-neutral-700'}`} />

                                <div className="p-5 space-y-4">
                                    {/* Device name & status */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <h3 className="font-semibold text-neutral-900 dark:text-white">{device.name}</h3>
                                            <p className="text-xs text-neutral-400 font-mono mt-0.5 truncate max-w-[160px]">{device.id}</p>
                                        </div>
                                        <button
                                            onClick={() => toggleStatus(device)}
                                            disabled={isUpdating}
                                            title={isOpen ? 'คลิกเพื่อปิด' : 'คลิกเพื่อเปิด'}
                                            className={`p-2 rounded-none transition-all shrink-0 ${isOpen ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 hover:bg-emerald-100' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 hover:bg-neutral-200'} ${isUpdating ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                                        >
                                            {isOpen ? <Power className="w-5 h-5" /> : <PowerOff className="w-5 h-5" />}
                                        </button>
                                    </div>

                                    {/* Status badge */}
                                    <div className="flex items-center flex-wrap gap-2">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-none text-xs font-semibold ${isOpen ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400'}`} />
                                            {isOpen ? 'เปิดรับประเมิน' : 'ปิดรับประเมิน'}
                                        </span>
                                        {device.form_title && (
                                            <span className="px-2 py-0.5 rounded-none bg-primary/10 text-primary dark:text-primary-light text-xs font-medium truncate max-w-[120px]">
                                                {device.form_title}
                                            </span>
                                        )}
                                        {isLive && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-none bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold animate-pulse">
                                                <Eye className="w-3 h-3" />
                                                กำลังดูอยู่
                                            </span>
                                        )}
                                    </div>

                                    {/* Last opened */}
                                    {lastOpened && (
                                        <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                                            <Eye className="w-3 h-3" />
                                            เปิด Link ล่าสุด: <span className="text-neutral-600 dark:text-neutral-300 font-medium">{lastOpened}</span>
                                        </div>
                                    )}

                                    {/* Personnel selector — only shows personnel assigned to this device */}
                                    <div>
                                        <label className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">
                                            <User className="w-3.5 h-3.5" />
                                            เลือกบุคลากรที่จะถูกประเมิน
                                            {device.assigned_personnel?.length > 0 && (
                                                <span className="ml-1 px-1.5 py-0.5 rounded-none bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 text-xs">
                                                    {device.assigned_personnel.length} คน
                                                </span>
                                            )}
                                        </label>
                                        {(!device.assigned_personnel || device.assigned_personnel.length === 0) ? (
                                            <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 rounded-none px-3 py-2">
                                                ยังไม่มีบุคลากรประจำ Device นี้ — ไปที่หน้า "บุคลากร" เพื่อเพิ่ม
                                            </p>
                                        ) : (
                                            <div className="relative">
                                                <select
                                                    value={device.personnel_id || ''}
                                                    onChange={e => assignPersonnel(device, e.target.value)}
                                                    disabled={isUpdating}
                                                    className={`w-full px-3 py-2.5 rounded-none border text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none appearance-none transition-colors ${isUpdating ? 'opacity-50 cursor-wait' : ''} bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white`}
                                                >
                                                    <option value="">— ไม่เลือกบุคลากร (ปิด) —</option>
                                                    {device.assigned_personnel.map(p => (
                                                        <option key={p.id} value={p.id}>
                                                            {p.name}{p.position ? ` (${p.position})` : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                                            </div>
                                        )}
                                        {device.personnel_name && (
                                            <p className="mt-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                                                <Check className="w-3 h-3" />
                                                กำลังประเมิน: {device.personnel_name}
                                            </p>
                                        )}
                                    </div>

                                    {/* Job Type Selector */}
                                    <div>
                                        <label className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">
                                            <Briefcase className="w-3.5 h-3.5" />
                                            เลือกรูปแบบงาน
                                        </label>
                                        {jobTypes.length === 0 ? (
                                            <p className="text-xs text-neutral-400 bg-neutral-50 dark:bg-neutral-800 rounded-none px-3 py-2">
                                                ยังไม่มีรูปแบบงาน — ไปที่หน้า "รูปแบบงาน" เพื่อเพิ่ม
                                            </p>
                                        ) : (
                                            <div className="relative">
                                                <select
                                                    value={selectedJobs[device.id] || ''}
                                                    onChange={e => assignJob(device, e.target.value)}
                                                    disabled={isUpdating}
                                                    className={`w-full px-3 py-2.5 rounded-none border text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none appearance-none transition-colors ${isUpdating ? 'opacity-50 cursor-wait' : ''} bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white`}
                                                >
                                                    <option value="">— ไม่ระบุรูปแบบงาน —</option>
                                                    {jobTypes.map(j => (
                                                        <option key={j.id} value={j.id}>{j.name}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                                            </div>
                                        )}
                                        {device.job_name && (
                                            <p className="mt-1.5 text-xs text-primary dark:text-primary-light font-medium flex items-center gap-1">
                                                <Briefcase className="w-3 h-3" />
                                                งาน: {device.job_name}
                                            </p>
                                        )}
                                    </div>

                                    {/* Link */}
                                    <div className="bg-neutral-50 dark:bg-neutral-800 rounded-none p-3">
                                        <p className="text-xs text-neutral-400 mb-1.5">Link สำหรับประเมิน</p>
                                        <div className="flex items-center gap-2">
                                            <p className="text-xs font-mono text-neutral-600 dark:text-neutral-300 flex-1 truncate">{link}</p>
                                            <button
                                                onClick={() => copyLink(device.id)}
                                                className="shrink-0 p-1.5 rounded-none hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                                                title="คัดลอก Link"
                                            >
                                                {copiedId === device.id
                                                    ? <Check className="w-3.5 h-3.5 text-emerald-500" />
                                                    : <Copy className="w-3.5 h-3.5" />
                                                }
                                            </button>
                                        </div>
                                    </div>

                                    {/* Warning if not open */}
                                    {!isOpen && (
                                        <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 rounded-none px-3 py-2">
                                            ⚠️ เลือกบุคลากรเพื่อเปิดรับการประเมินอัตโนมัติ
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
