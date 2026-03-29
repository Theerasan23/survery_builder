'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import {
    LayoutDashboard, FileText, Settings, LogOut,
    UserCog, PenTool, Database, List, ChevronLeft, ChevronRight, BarChart2,
    ClipboardList, ChevronDown, ChevronUp, Users, Monitor, Link2, Building2, Star, Briefcase
} from 'lucide-react';

function NavLink({ href, name, icon: Icon, isActive, collapsed }) {
    return (
        <li>
            <Link
                href={href}
                title={collapsed ? name : undefined}
                className={`flex items-center gap-3 px-3 py-2 transition-all duration-200 group relative overflow-hidden
                    ${isActive ? 'bg-white/10 text-white font-medium' : 'hover:bg-white/5 hover:text-white'}
                    ${collapsed ? 'justify-center' : ''}`}
            >
                {isActive && <span className="absolute left-0 top-0 h-full w-1 bg-white" />}
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-neutral-500 group-hover:text-neutral-300'}`} />
                {!collapsed && <span className="text-sm whitespace-nowrap overflow-hidden">{name}</span>}
            </Link>
        </li>
    );
}

function NavGroup({ label, icon: Icon, links, collapsed, storageKey, pathname }) {
    const isGroupActive = links.some(l => pathname.startsWith(l.href));
    const [open, setOpen] = useState(true);

    useEffect(() => {
        const saved = localStorage.getItem(storageKey);
        if (saved !== null) setOpen(saved !== 'false');
    }, [storageKey]);

    const toggle = () => {
        if (collapsed) return;
        setOpen(prev => {
            localStorage.setItem(storageKey, String(!prev));
            return !prev;
        });
    };

    return (
        <div className="mb-1">
            <button
                onClick={toggle}
                title={collapsed ? label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 transition-all duration-200 group mb-0.5
                    ${isGroupActive ? 'text-white' : 'text-neutral-400 hover:text-white hover:bg-white/5'}
                    ${collapsed ? 'justify-center' : 'justify-between'}`}
            >
                <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 shrink-0 ${isGroupActive ? 'text-white' : 'text-neutral-500 group-hover:text-neutral-300'}`} />
                    {!collapsed && <span className="text-sm font-semibold whitespace-nowrap">{label}</span>}
                </div>
                {!collapsed && (
                    open
                        ? <ChevronUp className="w-4 h-4 shrink-0 text-neutral-500" />
                        : <ChevronDown className="w-4 h-4 shrink-0 text-neutral-500" />
                )}
            </button>

            {(open || collapsed) && (
                <ul className={`space-y-0.5 ${!collapsed ? 'pl-3' : ''}`}>
                    {links.map(link => (
                        <NavLink
                            key={link.href}
                            href={link.href}
                            name={link.name}
                            icon={link.icon}
                            isActive={pathname.startsWith(link.href)}
                            collapsed={collapsed}
                        />
                    ))}
                </ul>
            )}
        </div>
    );
}

export default function Sidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const isAdmin = session?.user?.role === 'admin';

    const [collapsed, setCollapsed] = useState(false);
    const [systemName, setSystemName] = useState('ssj formbuilder');

    useEffect(() => {
        import('@/lib/actions').then(({ getOrgSettings }) =>
            getOrgSettings().then(data => { if (data.system_name) setSystemName(data.system_name); })
        ).catch(() => {});
    }, []);

    useEffect(() => {
        const saved = localStorage.getItem('sidebarCollapsed');
        if (saved !== null) setCollapsed(saved === 'true');
    }, []);

    const toggle = () => {
        setCollapsed(prev => {
            localStorage.setItem('sidebarCollapsed', String(!prev));
            return !prev;
        });
    };

    const surveyLinks = [
        { name: 'แดชบอร์ด',        href: '/admin/dashboard',    icon: LayoutDashboard },
        { name: 'จัดการแบบฟอร์ม',  href: '/admin/manage-forms', icon: Settings },
        { name: 'สร้างแบบฟอร์ม',   href: '/admin/builder',      icon: PenTool },
    ];

    const settingsLinks = [
        { name: 'หัวข้อแบบฟอร์ม',  href: '/admin/topics',    icon: List },
        { name: 'ตัวเลือกมาตรฐาน', href: '/admin/options',   icon: Database },
        { name: 'จัดการผู้ใช้งาน',  href: '/admin/users',     icon: UserCog },
        { name: 'ข้อมูลหน่วยงาน',  href: '/admin/settings',  icon: Building2 },
    ];

    const personnelLinks = [
        { name: 'บุคลากร',               href: '/admin/personnel',         icon: Users },
        { name: 'อุปกรณ์ (Device)',      href: '/admin/devices',           icon: Monitor },
        { name: 'อุปกรณ์และแบบประเมิน', href: '/admin/link-generator',    icon: Link2 },
        { name: 'แบบประเมินบุคลากร',    href: '/admin/personnel-forms',   icon: ClipboardList },
        { name: 'รูปแบบงาน',            href: '/admin/job-types',         icon: Briefcase },
        { name: 'รายงานบุคลากร',        href: '/admin/personnel-report',  icon: BarChart2 },
    ];

    return (
        <div
            className={`relative flex flex-col h-screen bg-[#141D2E] border-r border-white/5 text-neutral-300 transition-all duration-300 shrink-0 ${collapsed ? 'w-16' : 'w-64'}`}
        >
            {/* Header / Logo */}
            <div className={`flex items-center border-b border-white/5 h-16 ${collapsed ? 'justify-center px-0' : 'justify-between px-5'}`}>
                {!collapsed && (
                    <h1 className="text-base font-bold text-white tracking-wide flex items-center gap-2 truncate">
                        <FileText className="w-5 h-5 text-white/70 shrink-0" />
                        <span className="text-white whitespace-nowrap truncate">
                            {systemName}
                        </span>
                    </h1>
                )}
                <button
                    onClick={toggle}
                    className="p-1.5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors shrink-0"
                    title={collapsed ? 'ขยาย' : 'ย่อ'}
                >
                    {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>
            </div>

            {/* Nav Links */}
            <div className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
                <NavGroup
                    label="แบบประเมิน"
                    icon={ClipboardList}
                    links={surveyLinks}
                    collapsed={collapsed}
                    storageKey="sidebarGroupOpen"
                    pathname={pathname}
                />

                {!collapsed && <div className="mx-3 my-2 h-px bg-white/10" />}
                {collapsed && <div className="my-2 h-px bg-white/10 mx-2" />}

                <NavGroup
                    label="ประเมินบุคลากร"
                    icon={Star}
                    links={personnelLinks}
                    collapsed={collapsed}
                    storageKey="sidebarPersonnelGroupOpen"
                    pathname={pathname}
                />

                {isAdmin && (
                    <>
                        {!collapsed && <div className="mx-3 my-2 h-px bg-white/10" />}
                        {collapsed && <div className="my-2 h-px bg-white/10 mx-2" />}

                        <NavGroup
                            label="ตั้งค่าระบบ"
                            icon={Settings}
                            links={settingsLinks}
                            collapsed={collapsed}
                            storageKey="sidebarSettingsGroupOpen"
                            pathname={pathname}
                        />
                    </>
                )}
            </div>

            {/* Sign Out */}
            <div className="p-2 border-t border-white/5">
                <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    title={collapsed ? 'ออกจากระบบ' : undefined}
                    className={`flex items-center gap-3 px-3 py-2.5 w-full hover:bg-red-500/10 hover:text-red-400 transition-colors text-neutral-400 ${collapsed ? 'justify-center' : ''}`}
                >
                    <LogOut className="w-5 h-5 shrink-0" />
                    {!collapsed && <span className="text-sm whitespace-nowrap">ออกจากระบบ</span>}
                </button>
            </div>
        </div>
    );
}
