'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface BOMComponent {
    productId: string;
    quantity: number;
    unitCost: number;
    product?: { id: string; name: string; sku: string };
}

interface BOMOperation {
    sequence: number;
    name: string;
    workCenter: string;
    duration: number;
    cost: number;
}

interface BOMFormData {
    name: string;
    productId: string;
    version: string;
    status: string;
    components: BOMComponent[];
    operations: BOMOperation[];
}

interface Product {
    id: string;
    name: string;
    sku: string;
    cost?: number;
}

export default function NewBOMPage() {
    const router = useRouter();
    const [products, setProducts] = useState<Product[]>([]);
    const [formData, setFormData] = useState<BOMFormData>({
        name: '',
        productId: '',
        version: '1',
        status: 'draft',
        components: [],
        operations: []
    });
    const [newComponent, setNewComponent] = useState({
        productId: '',
        quantity: 1,
        unitCost: 0
    });
    const [newOperation, setNewOperation] = useState({
        sequence: 1,
        name: '',
        workCenter: '',
        duration: 0,
        cost: 0
    });

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }

        // Fetch products for selection
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/products`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                const items = Array.isArray(data) ? data : (data?.data?.data || data?.data || []);
                setProducts(Array.isArray(items) ? items : []);
            })
            .catch(err => console.error(err));
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('token');

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/boms`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const data = await response.json();
                const created = data?.data || data;
                router.push(`/boms/${created.id}`);
            } else {
                alert('Failed to create BOM');
            }
        } catch (err) {
            console.error(err);
            alert('Error creating BOM');
        }
    };

    const addComponent = () => {
        if (!newComponent.productId) return;

        const product = products.find((p: any) => p.id === newComponent.productId);
        setFormData({
            ...formData,
            components: [...formData.components, {
                ...newComponent,
                product
            }]
        });
        setNewComponent({ productId: '', quantity: 1, unitCost: 0 });
    };

    const removeComponent = (index: number) => {
        setFormData({
            ...formData,
            components: formData.components.filter((_, i) => i !== index)
        });
    };

    const addOperation = () => {
        if (!newOperation.name) return;

        setFormData({
            ...formData,
            operations: [...formData.operations, newOperation]
        });
        setNewOperation({
            sequence: formData.operations.length + 2,
            name: '',
            workCenter: '',
            duration: 0,
            cost: 0
        });
    };

    const removeOperation = (index: number) => {
        setFormData({
            ...formData,
            operations: formData.operations.filter((_, i) => i !== index)
        });
    };

    return (
        <AppLayout>
            <div className="mb-6">
                <Link href="/boms" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to BOMs
                </Link>
                <h1 className="text-3xl font-bold text-[#3E2723]">Create New BOM</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card title="Basic Information">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">BOM Name *</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#8D6E63]"
                                placeholder="e.g., Laptop Assembly BOM"
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
                            <label className="block text-sm font-medium text-gray-700 mb-2">Version</label>
                            <input
                                type="text"
                                value={formData.version}
                                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#8D6E63]"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#8D6E63]"
                            >
                                <option value="draft">Draft</option>
                                <option value="active">Active</option>
                                <option value="obsolete">Obsolete</option>
                            </select>
                        </div>
                    </div>
                </Card>

                <Card title="Components">
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Component</label>
                                <select
                                    value={newComponent.productId}
                                    onChange={(e) => setNewComponent({ ...newComponent, productId: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#8D6E63]"
                                >
                                    <option value="">Select component</option>
                                    {products.map((product: any) => (
                                        <option key={product.id} value={product.id}>
                                            {product.name} ({product.sku})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={newComponent.quantity}
                                    onChange={(e) => setNewComponent({ ...newComponent, quantity: parseInt(e.target.value) || 0 })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#8D6E63]"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Unit Cost</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={newComponent.unitCost}
                                    onChange={(e) => setNewComponent({ ...newComponent, unitCost: parseFloat(e.target.value) || 0 })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#8D6E63]"
                                />
                            </div>
                        </div>

                        <Button type="button" variant="secondary" icon={Plus} onClick={addComponent}>
                            Add Component
                        </Button>

                        {formData.components.length > 0 && (
                            <div className="mt-4 overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Component</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {formData.components.map((comp: any, index) => (
                                            <tr key={index}>
                                                <td className="px-6 py-4 text-sm text-gray-900">{comp.product?.name}</td>
                                                <td className="px-6 py-4 text-sm text-gray-500">{comp.quantity}</td>
                                                <td className="px-6 py-4 text-sm text-gray-500">${comp.unitCost.toFixed(2)}</td>
                                                <td className="px-6 py-4 text-sm text-gray-900">${(comp.quantity * comp.unitCost).toFixed(2)}</td>
                                                <td className="px-6 py-4 text-sm">
                                                    <button
                                                        type="button"
                                                        onClick={() => removeComponent(index)}
                                                        className="text-red-600 hover:text-red-900"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </Card>

                <Card title="Operations">
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Sequence</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={newOperation.sequence}
                                    onChange={(e) => setNewOperation({ ...newOperation, sequence: parseInt(e.target.value) || 0 })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#8D6E63]"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Operation Name</label>
                                <input
                                    type="text"
                                    value={newOperation.name}
                                    onChange={(e) => setNewOperation({ ...newOperation, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#8D6E63]"
                                    placeholder="e.g., Assembly"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Work Center</label>
                                <input
                                    type="text"
                                    value={newOperation.workCenter}
                                    onChange={(e) => setNewOperation({ ...newOperation, workCenter: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#8D6E63]"
                                    placeholder="e.g., WC-01"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Duration (min)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={newOperation.duration}
                                    onChange={(e) => setNewOperation({ ...newOperation, duration: parseInt(e.target.value) || 0 })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#8D6E63]"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Cost ($)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={newOperation.cost}
                                    onChange={(e) => setNewOperation({ ...newOperation, cost: parseFloat(e.target.value) || 0 })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#8D6E63]"
                                />
                            </div>
                        </div>

                        <Button type="button" variant="secondary" icon={Plus} onClick={addOperation}>
                            Add Operation
                        </Button>

                        {formData.operations.length > 0 && (
                            <div className="mt-4 overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sequence</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Operation</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Work Center</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {formData.operations.map((op: any, index) => (
                                            <tr key={index}>
                                                <td className="px-6 py-4 text-sm text-gray-500">{op.sequence}</td>
                                                <td className="px-6 py-4 text-sm text-gray-900">{op.name}</td>
                                                <td className="px-6 py-4 text-sm text-gray-500">{op.workCenter}</td>
                                                <td className="px-6 py-4 text-sm text-gray-500">{op.duration} min</td>
                                                <td className="px-6 py-4 text-sm text-gray-900">${op.cost.toFixed(2)}</td>
                                                <td className="px-6 py-4 text-sm">
                                                    <button
                                                        type="button"
                                                        onClick={() => removeOperation(index)}
                                                        className="text-red-600 hover:text-red-900"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </Card>

                <div className="flex justify-end gap-4">
                    <Button type="button" variant="secondary" onClick={() => router.push('/boms')}>
                        Cancel
                    </Button>
                    <Button type="submit">Create BOM</Button>
                </div>
            </form>
        </AppLayout>
    );
}
