'use client';

import Sidebar from './Sidebar';
import Header from './Header';

export default function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-screen bg-[#FAF8F6]">
            {/* Sidebar - Hidden on mobile, fixed width on desktop */}
            <Sidebar />

            <div className="flex-1 flex flex-col md:ml-64 transition-all duration-300">
                {/* Header - Sticky top */}
                <Header />

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto p-6">
                    <div className="container mx-auto max-w-7xl">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
