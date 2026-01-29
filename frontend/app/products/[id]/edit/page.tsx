'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import ProductForm from '@/components/products/ProductForm';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function EditProductPage() {
    const params = useParams();
    const router = useRouter();
    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token || !params.id) return;

        fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/${params.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch');
                return res.json();
            })
            .then(data => {
                setProduct(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
                // Optionally redirect or show error
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

    if (!product) {
        return (
            <AppLayout>
                <div className="text-center py-12">Product not found</div>
            </AppLayout>
        )
    }

    return (
        <AppLayout>
            <div className="mb-6">
                <Link href={`/products/${params.id}`} className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to Details
                </Link>
                <h1 className="text-2xl font-bold text-[#3E2723]">Edit Product</h1>
                <p className="text-gray-500">Update product information</p>
            </div>

            <ProductForm initialData={product} isEdit={true} />
        </AppLayout>
    );
}
