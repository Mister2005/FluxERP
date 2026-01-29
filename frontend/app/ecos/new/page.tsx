'use client';

import AppLayout from '@/components/layout/AppLayout';
import ECOForm from '@/components/ecos/ECOForm';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewECOPage() {
    return (
        <AppLayout>
            <div className="mb-6">
                <Link href="/ecos" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to ECOs
                </Link>
                <h1 className="text-2xl font-bold text-[#3E2723]">Create Engineering Change Order</h1>
                <p className="text-gray-500">Initiate a new change request for approval</p>
            </div>

            <ECOForm />
        </AppLayout>
    );
}
