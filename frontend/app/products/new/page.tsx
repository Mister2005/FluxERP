'use client';

import AppLayout from '@/components/layout/AppLayout';
import ProductForm from '@/components/products/ProductForm';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewProductPage() {
    return (
        <AppLayout>
            <div className="mb-6">
                <Link href="/products" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to Products
                </Link>
                <h1 className="text-2xl font-bold text-[#3E2723]">Create New Product</h1>
                <p className="text-gray-500">Add a new item to your inventory</p>
            </div>

            <ProductForm />
        </AppLayout>
    );
}
