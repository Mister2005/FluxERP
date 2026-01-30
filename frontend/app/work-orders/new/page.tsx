'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface Product {
    id: string;
    name: string;
    sku: string;
}

interface BOM {
    id: string;
    name: string;
    version: string;
    productId?: string;
}

export default function NewWorkOrderPage() {
    const router = useRouter();
    const [products, setProducts] = useState<Product[]>([]);
    const [boms, setBoms] = useState<BOM[]>([]);
    const [filteredBoms, setFilteredBoms] = useState<BOM[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        productId: '',
        bomId: '',
        quantity: 1,
        priority: 'medium',
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
                // Handle various response formats
                const productsList = Array.isArray(productsData) ? productsData : (productsData?.data || []);
                const bomsList = Array.isArray(bomsData) ? bomsData : (bomsData?.data || []);
                
                setProducts(productsList);
                setBoms(bomsList);
                setFilteredBoms(bomsList);
                setLoading(false);
            })
            .catch(err => {
                console.error('Error loading data:', err);
                setError('Failed to load products and BOMs');
                setLoading(false);
            });
    }, [router]);

    // Filter BOMs when product changes
    useEffect(() => {
        if (formData.productId) {
            const filtered = boms.filter(bom => bom.productId === formData.productId);
            setFilteredBoms(filtered.length > 0 ? filtered : boms);
        } else {
            setFilteredBoms(boms);
        }
    }, [formData.productId, boms]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        
        const token = localStorage.getItem('token');
        if (!token) {
            setError('Not authenticated');
            setSubmitting(false);
            return;
        }

        if (!formData.productId) {
            setError('Please select a product');
            setSubmitting(false);
            return;
        }

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/workorders`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: formData.name || null,
                    productId: formData.productId,
                    bomId: formData.bomId || null,
                    quantity: formData.quantity,
                    priority: formData.priority,
                    scheduledStart: formData.scheduledStart,
                    scheduledEnd: formData.scheduledEnd
                })
            });

            const data = await response.json();

            if (response.ok) {
                router.push(`/work-orders/${data.id}`);
            } else {
                setError(data.error || 'Failed to create work order');
            }
        } catch (err) {
            console.error('Create work order error:', err);
            setError('Error creating work order. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <AppLayout>
                <div className="flex items-center justify-center h-96">
                    <div className="spinner"></div>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="mb-6">
                <Link href="/work-orders" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to Work Orders
                </Link>
                <h1 className="text-3xl font-bold text-[#3E2723]">Create New Work Order</h1>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                    <AlertCircle className="w-5 h-5" />
                    <span>{error}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card title="Basic Information">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Work Order Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#8D6E63]"
                                placeholder="e.g., Laptop Assembly - Batch 001"
                            />
                            <p className="text-xs text-gray-500 mt-1">Optional - will use product name if not provided</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Product *</label>
                            <select
                                required
                                value={formData.productId}
                                onChange={(e) => setFormData({ ...formData, productId: e.target.value, bomId: '' })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#8D6E63]"
                            >
                                <option value="">Select a product</option>
                                {products.map((product) => (
                                    <option key={product.id} value={product.id}>
                                        {product.name} ({product.sku})
                                    </option>
                                ))}
                            </select>
                            {products.length === 0 && (
                                <p className="text-xs text-red-500 mt-1">No products found. Please create a product first.</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">BOM (Optional)</label>
                            <select
                                value={formData.bomId}
                                onChange={(e) => setFormData({ ...formData, bomId: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#8D6E63]"
                            >
                                <option value="">Select a BOM (optional)</option>
                                {filteredBoms.map((bom) => (
                                    <option key={bom.id} value={bom.id}>
                                        {bom.name} (v{bom.version})
                                    </option>
                                ))}
                            </select>
                            {filteredBoms.length === 0 && formData.productId && (
                                <p className="text-xs text-gray-500 mt-1">No BOMs found for this product</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Quantity *</label>
                            <input
                                type="number"
                                required
                                min="1"
                                value={formData.quantity}
                                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
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
                    <Button type="submit" isLoading={submitting} disabled={products.length === 0}>
                        Create Work Order
                    </Button>
                </div>
            </form>
        </AppLayout>
    );
}
