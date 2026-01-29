'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Package,
    Layers,
    FileText,
    Ambulance,
    Truck,
    Settings,
    Users,
    LogOut,
    BrainCircuit,
    Box
} from 'lucide-react';

const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Products', href: '/products', icon: Package },
    { label: 'BOMs', href: '/boms', icon: Layers },
    { label: 'ECOs', href: '/ecos', icon: FileText },
    { label: 'Work Orders', href: '/work-orders', icon: Ambulance }, // Using Ambulance as placeholder for Production
    { label: 'Suppliers', href: '/suppliers', icon: Truck },
    { label: 'AI Assistant', href: '/ai', icon: BrainCircuit },
    { label: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 flex flex-col z-10 hidden md:flex">
            {/* Logo Area */}
            <div className="h-16 flex items-center px-6 border-b border-gray-100">
                <Box className="w-8 h-8 text-[#8D6E63] mr-3" strokeWidth={2.5} />
                <span className="text-xl font-bold text-[#3E2723]">FluxERP</span>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
                <div className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Main Menu
                </div>

                {navItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`
                flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${isActive
                                    ? 'bg-[#EFEBE9] text-[#6D4C41]'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
              `}
                        >
                            <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-[#8D6E63]' : 'text-gray-400'}`} />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            {/* User / Footer */}
            <div className="p-4 border-t border-gray-100 bg-[#FAF8F6]">
                <Link
                    href="/login" // In real app, this would be a logout action
                    className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                    <LogOut className="w-5 h-5 mr-3" />
                    Sign Out
                </Link>
            </div>
        </aside>
    );
}
