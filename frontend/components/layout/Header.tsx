'use client';

import { Bell, Search, User, Menu } from 'lucide-react';
import { useState, useEffect } from 'react';

interface HeaderProps {
    onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
    const [user, setUser] = useState<{ name: string; email: string; role: any } | null>(null);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            setUser(JSON.parse(userData));
        }
    }, []);

    return (
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10 w-full">
            {/* Left side - Hamburger + Search */}
            <div className="flex items-center gap-3 w-full max-w-md">
                <button
                    onClick={onMenuClick}
                    className="md:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                >
                    <Menu className="h-5 w-5" />
                </button>

                <div className="relative w-full hidden sm:block">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search products, BOMs, ECOs..."
                        className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-[#8D6E63] sm:text-sm transition duration-150 ease-in-out"
                    />
                </div>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-4">
                <button className="p-2 rounded-full text-gray-500 hover:bg-gray-100 focus:outline-none relative">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white" />
                </button>

                <div className="h-8 w-px bg-gray-200 mx-2" />

                <div className="flex items-center">
                    <div className="text-right mr-3 hidden sm:block">
                        <div className="text-sm font-medium text-gray-900">{user?.name || 'Guest User'}</div>
                        <div className="text-xs text-gray-500">{user?.role?.name || 'Viewer'}</div>
                    </div>
                    <div className="h-9 w-9 rounded-full bg-[#8D6E63] flex items-center justify-center text-white font-medium shadow-sm">
                        {user?.name ? user.name.charAt(0).toUpperCase() : <User className="h-5 w-5" />}
                    </div>
                </div>
            </div>
        </header>
    );
}
