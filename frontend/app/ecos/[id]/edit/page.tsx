'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import ECOForm from '@/components/ecos/ECOForm';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function EditECOPage() {
    const params = useParams();
    const router = useRouter();
    const [eco, setEco] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token || !params.id) return;

        fetch(`${process.env.NEXT_PUBLIC_API_URL}/ecos/${params.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch');
                return res.json();
            })
            .then(data => {
                setEco(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [params.id]);

    if (loading) {
        return (
            <AppLayout>
                <div className="flex items-center justify-center h-96">
                    <div className="spinner"></div>
                </div>
            </AppLayout>
        );
    }

    if (!eco) {
        return <AppLayout>ECP not found</AppLayout>
    }

    return (
        <AppLayout>
            <div className="mb-6">
                <Link href={`/ecos/${params.id}`} className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to Details
                </Link>
                <h1 className="text-2xl font-bold text-[#3E2723]">Edit Change Order</h1>
                <p className="text-gray-500">Update request details</p>
            </div>

            <ECOForm initialData={eco} isEdit={true} />
        </AppLayout>
    );
}
