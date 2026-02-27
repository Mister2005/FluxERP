'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
    Box,
    X
} from 'lucide-react';
import { usePermissions, pagePermissions } from '@/lib/permissions';

const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Products', href: '/products', icon: Package },
    { label: 'BOMs', href: '/boms', icon: Layers },
    { label: 'ECOs', href: '/ecos', icon: FileText },
    { label: 'Work Orders', href: '/work-orders', icon: Ambulance },
    { label: 'Suppliers', href: '/suppliers', icon: Truck },
    { label: 'AI Assistant', href: '/ai', icon: BrainCircuit },
    { label: 'Reports', href: '/reports', icon: FileText },
    { label: 'Settings', href: '/settings', icon: Settings },
];

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { canAny } = usePermissions();

    const handleSignOut = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
    };

    // Filter nav items based on user permissions
    const visibleNavItems = navItems.filter(item => {
        const requiredPerms = pagePermissions[item.href];
        // No permissions required = visible to all
        if (!requiredPerms || requiredPerms.length === 0) return true;
        return canAny(requiredPerms);
    });

    return (
        <>
            {/* Mobile overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-20 md:hidden"
                    onClick={onClose}
                />
            )}

            <aside className={`
                fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 flex flex-col z-30
                transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                md:translate-x-0
            `}>
                {/* Logo Area */}
                <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100">
                    <div className="flex items-center">
                        <Box className="w-8 h-8 text-[#8D6E63] mr-3" strokeWidth={2.5} />
                        <span className="text-xl font-bold text-[#3E2723]">FluxERP</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="md:hidden p-1 rounded-lg hover:bg-gray-100 text-gray-500"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
                    <div className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Main Menu
                    </div>

                    {visibleNavItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onClose}
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
                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                        <LogOut className="w-5 h-5 mr-3" />
                        Sign Out
                    </button>
                </div>
            </aside>
        </>
    );
}
