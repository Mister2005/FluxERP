'use client';

import AppLayout from '@/components/layout/AppLayout';
import { ShieldX } from 'lucide-react';
import Link from 'next/link';

interface AccessDeniedProps {
    /** Which feature/page was requested */
    feature?: string;
}

export default function AccessDenied({ feature }: AccessDeniedProps) {
    return (
        <AppLayout>
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <div className="bg-red-50 rounded-full p-6 mb-6">
                    <ShieldX className="w-16 h-16 text-red-400" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Not Granted</h1>
                <p className="text-gray-500 max-w-md mb-6">
                    You don&apos;t have permission to access {feature ? <strong>{feature}</strong> : 'this page'}.
                    Please contact your administrator if you need access.
                </p>
                <Link
                    href="/dashboard"
                    className="inline-flex items-center px-5 py-2.5 bg-[#8D6E63] text-white rounded-lg hover:bg-[#6D4C41] transition-colors font-medium"
                >
                    Go to Dashboard
                </Link>
            </div>
        </AppLayout>
    );
}
