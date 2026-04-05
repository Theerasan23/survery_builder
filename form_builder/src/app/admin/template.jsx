'use client';

import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, PenTool, List, Database, Settings, Users, Monitor, Link2, Building2, BarChart2, ClipboardList, Briefcase } from 'lucide-react';

function usePageMeta(pathname) {
    let pageTitle = 'แผงควบคุม';
    let pageDescription = 'จัดการการตั้งค่าและการกำหนดค่าระบบ';
    let PageIcon = Settings;

    if (pathname.includes('/admin/dashboard/topics/')) {
        pageTitle = 'วิเคราะห์ตามหัวข้อ';
        pageDescription = 'สรุปผลแบบฟอร์มรวมตามหัวข้อ พร้อมเลือกแบบฟอร์มและช่วงเวลา';
        PageIcon = BarChart2;
    } else if (pathname.includes('/admin/dashboard')) {
        pageTitle = 'แดชบอร์ด';
        pageDescription = 'ภาพรวมของแบบฟอร์มทั้งหมด จำนวนการตอบกลับ และคะแนนผลการประเมินในที่เดียว';
        PageIcon = LayoutDashboard;
    } else if (pathname.includes('/admin/builder')) {
        pageTitle = 'สร้างแบบฟอร์ม';
        pageDescription = 'สร้างและแก้ไขแบบสำรวจด้วยอินเทอร์เฟซแบบลากและวาง';
        PageIcon = PenTool;
    } else if (pathname.includes('/admin/topics')) {
        pageTitle = 'หัวข้อหลักของแบบฟอร์ม';
        pageDescription = 'จัดการหัวข้อหลักและด้านต่างๆ ของแบบฟอร์ม';
        PageIcon = List;
    } else if (pathname.includes('/admin/options')) {
        pageTitle = 'ตัวเลือกมาตรฐาน';
        pageDescription = 'จัดการชุดตัวเลือกที่ใช้ซ้ำได้สำหรับคำถามแบบเลือกตอบและดรอปดาวน์';
        PageIcon = Database;
    } else if (pathname.includes('/admin/manage-forms')) {
        pageTitle = 'จัดการแบบฟอร์ม';
        pageDescription = 'ดู แก้ไข หรือลบแบบฟอร์มสำรวจที่มีอยู่ในระบบ';
        PageIcon = Settings;
    } else if (pathname.includes('/admin/personnel-forms/builder')) {
        pageTitle = 'สร้างแบบประเมินบุคลากร';
        pageDescription = 'ออกแบบคำถามสำหรับแบบประเมินความพึงพอใจบุคลากร';
        PageIcon = ClipboardList;
    } else if (pathname.includes('/admin/personnel-forms')) {
        pageTitle = 'แบบประเมินบุคลากร';
        pageDescription = 'จัดการแบบประเมินความพึงพอใจสำหรับบุคลากร';
        PageIcon = ClipboardList;
    } else if (pathname.includes('/admin/job-types')) {
        pageTitle = 'รูปแบบงาน';
        pageDescription = 'จัดการประเภทงานสำหรับจัดกลุ่มการประเมินบุคลากร';
        PageIcon = Briefcase;
    } else if (pathname.includes('/admin/personnel-report/by-job')) {
        pageTitle = 'รายงานตามงาน';
        pageDescription = 'สรุปคะแนนการประเมินบุคลากรแยกตามรูปแบบงาน';
        PageIcon = BarChart2;
    } else if (pathname.includes('/admin/personnel-report')) {
        pageTitle = 'รายงานบุคลากร';
        pageDescription = 'สรุปคะแนนความพึงพอใจของแต่ละบุคลากรตามช่วงเวลา';
        PageIcon = BarChart2;
    } else if (pathname.includes('/admin/personnel')) {
        pageTitle = 'บุคลากร';
        pageDescription = 'จัดการรายชื่อบุคลากรและเชื่อมโยงกับแบบประเมิน';
        PageIcon = Users;
    } else if (pathname.includes('/admin/devices')) {
        pageTitle = 'อุปกรณ์ (Device)';
        pageDescription = 'จัดการ Device สำหรับการประเมิน พร้อม UUID และสถานะเปิด/ปิด';
        PageIcon = Monitor;
    } else if (pathname.includes('/admin/link-generator')) {
        pageTitle = 'อุปกรณ์และแบบประเมิน';
        pageDescription = 'ให้เลือกเจ้าหน้าที่ในอุปกรณ์นั้นๆ เพื่อส่งแบบการประเมิน';
        PageIcon = Link2;
    } else if (pathname.includes('/admin/settings')) {
        pageTitle = 'บันทึกข้อมูลหน่วยงาน';
        pageDescription = 'ตั้งค่าโลโก้ ชื่อหน่วยงาน และชื่อระบบที่แสดงในแบบฟอร์มและเมนูด้านซ้าย';
        PageIcon = Building2;
    }

    return { pageTitle, pageDescription, PageIcon };
}

export default function Template({ children }) {
    const pathname = usePathname();
    const { pageTitle, pageDescription, PageIcon } = usePageMeta(pathname);

    return (
        <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
        >
            {/* FULL WIDTH HEADER */}
            <div className="relative overflow-hidden w-full bg-[#21304A] dark:bg-[#1a2538] px-8 py-10 md:py-14 shadow-lg">
                {/* Decorative blobs */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 blur-2xl translate-y-1/4 -translate-x-1/4"></div>
                <div className="absolute top-1/2 right-[10%] w-32 h-32 bg-sky-400/10 blur-2xl -translate-y-1/2 rounded-full"></div>

                {/* Dot grid pattern */}
                <div
                    className="absolute inset-0 opacity-[0.07]"
                    style={{
                        backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                        backgroundSize: '24px 24px',
                    }}
                />

                {/* Circle rings */}
                <div className="absolute -right-10 -top-10 w-60 h-60 border border-white/10 rounded-full"></div>
                <div className="absolute -right-16 -top-16 w-72 h-72 border border-white/5 rounded-full"></div>

                <div className="relative z-10 flex flex-col space-y-3 max-w-[98%] mx-auto mb-6">
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
                        <div className="p-3 bg-white/15 backdrop-blur-md shadow-inner">
                            <PageIcon className="w-8 h-8 text-white" />
                        </div>
                        {pageTitle}
                    </h1>
                    <p className="text-white/70 text-base md:text-lg max-w-2xl font-medium">
                        {pageDescription}
                    </p>
                </div>
            </div>

            <div className="mx-auto w-[98%] max-w-[98%] -mt-10 relative z-20 pb-12">
                {children}
            </div>
        </motion.div>
    );
}
