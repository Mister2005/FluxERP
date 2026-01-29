'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewWorkOrderPage() {
    const router = useRouter();
    const [products, setProducts] = useState([]);
    const [boms, setBoms] = useState([]);
    const [formData, setFormData] = useState({
        name: '',
        productId: '',
        bomId: '',
        quantity: 1,
        priority: 'medium',
        status: 'planned',
        scheduledStart: new Date().toISOString().split('T')[0],
        scheduledEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }

        // Fetch products and BOMs
        Promise.all([
            fetch(`${process.env.NEXT_PUBLIC_API_URL}/products`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(res => res.json()),
            fetch(`${process.env.NEXT_PUBLIC_API_URL}/boms`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(res => res.json())
        ])
            .then(([productsData, bomsData]) => {
                setProducts(productsData);
                setBoms(bomsData);
            })
            .catch(err => console.error(err));
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('token');

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/workorders`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const data = await response.json();
                router.push(`/work-orders/${data.id}`);
            } else {
                alert('Failed to create work order');
            }
        } catch (err) {
            console.error(err);
            alert('Error creating work order');
        }
    };

    return (
        <AppLayout>
            <div className="mb-6">
                <Link href="/work-orders" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to Work Orders
                </Link>
                <h1 className="text-3xl font-bold text-[#3E2723]">Create New Work Order</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card title="Basic Information">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Work Order Name *</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#8D6E63]"
                                placeholder="e.g., Laptop Assembly - Batch 001"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Product *</label>
                            <select
                                required
                                value={formData.productId}
                                onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#8D6E63]"
                            >
                                <option value="">Select a product</option>
                                {products.map((product: any) => (
                                    <option key={product.id} value={product.id}>
                                        {product.name} ({product.sku})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">BOM *</label>
                            <select
                                required
                                value={formData.bomId}
                                onChange={(e) => setFormData({ ...formData, bomId: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#8D6E63]"
                            >
                                <option value="">Select a BOM</option>
                                {boms.map((bom: any) => (
                                    <option key={bom.id} value={bom.id}>
                                        {bom.name} (v{bom.version})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Quantity *</label>
                            <input
                                type="number"
                                required
                                min="1"
                                value={formData.quantity}
                                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#8D6E63]"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                            <select
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#8D6E63]"
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#8D6E63]"
                            >
                                <option value="planned">Planned</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                            <input
                                type="date"
                                value={formData.scheduledStart}
                                onChange={(e) => setFormData({ ...formData, scheduledStart: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#8D6E63]"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Due Date *</label>
                            <input
                                type="date"
                                required
                                value={formData.scheduledEnd}
                                onChange={(e) => setFormData({ ...formData, scheduledEnd: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#8D6E63]"
                            />
                        </div>
                    </div>
                </Card>

                <div className="flex justify-end gap-4">
                    <Button type="button" variant="secondary" onClick={() => router.push('/work-orders')}>
                        Cancel
                    </Button>
                    <Button type="submit">Create Work Order</Button>
                </div>
            </form>
        </AppLayout>
    );
}
