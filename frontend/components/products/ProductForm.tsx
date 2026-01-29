'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useRouter } from 'next/navigation';
import { Save, X } from 'lucide-react';

interface ProductFormProps {
    initialData?: any;
    isEdit?: boolean;
}

export default function ProductForm({ initialData, isEdit = false }: ProductFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        sku: initialData?.sku || '',
        category: initialData?.category || '',
        description: initialData?.description || '',
        cost: initialData?.cost || 0,
        quantity: initialData?.quantity || 0,
        supplier: initialData?.supplier || '',
        status: initialData?.status || 'active'
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'cost' || name === 'quantity' ? parseFloat(value) : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const url = isEdit
                ? `${process.env.NEXT_PUBLIC_API_URL}/products/${initialData.id}`
                : `${process.env.NEXT_PUBLIC_API_URL}/products`;

            const method = isEdit ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (!res.ok) throw new Error('Failed to save product');

            router.push('/products');
            router.refresh(); // Refresh list
        } catch (error) {
            console.error(error);
            alert('Failed to save product');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-6">
                    <Card title="Basic Information">
                        <div className="grid grid-cols-1 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    className="w-full"
                                    placeholder="e.g. High Performance Motor"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                                    <input
                                        type="text"
                                        name="sku"
                                        value={formData.sku}
                                        onChange={handleChange}
                                        required
                                        className="w-full"
                                        placeholder="e.g. MTR-100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                    <select
                                        name="category"
                                        value={formData.category}
                                        onChange={handleChange}
                                        className="w-full"
                                    >
                                        <option value="">Select Category</option>
                                        <option value="Electronics">Electronics</option>
                                        <option value="Mechanical">Mechanical</option>
                                        <option value="Assemblies">Assemblies</option>
                                        <option value="Raw Materials">Raw Materials</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows={4}
                                    className="w-full"
                                    placeholder="Detailed product description..."
                                />
                            </div>
                        </div>
                    </Card>

                    <Card title="Inventory & Costing">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost ($)</label>
                                <input
                                    type="number"
                                    name="cost"
                                    value={formData.cost}
                                    onChange={handleChange}
                                    step="0.01"
                                    min="0"
                                    className="w-full"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Initial Quantity</label>
                                <input
                                    type="number"
                                    name="quantity"
                                    value={formData.quantity}
                                    onChange={handleChange}
                                    min="0"
                                    className="w-full"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    className="w-full"
                                >
                                    <option value="active">Active</option>
                                    <option value="draft">Draft</option>
                                    <option value="archived">Archived</option>
                                </select>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="md:col-span-1">
                    <Card className="sticky top-24">
                        <h3 className="font-medium text-gray-900 mb-4">Actions</h3>
                        <div className="space-y-3">
                            <Button type="submit" isLoading={loading} className="w-full" icon={Save}>
                                {isEdit ? 'Update Product' : 'Create Product'}
                            </Button>
                            <Button
                                type="button"
                                variant="secondary"
                                className="w-full"
                                icon={X}
                                onClick={() => router.back()}
                            >
                                Cancel
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
        </form>
    );
}
