'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewSupplierPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        leadTime: 7,
        rating: 0,
        onTimeDelivery: 95,
        defectRate: 2,
        isActive: true
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('token');

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/suppliers`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const data = await response.json();
                router.push(`/suppliers/${data.id}`);
            } else {
                alert('Failed to create supplier');
            }
        } catch (err) {
            console.error(err);
            alert('Error creating supplier');
        }
    };

    return (
        <AppLayout>
            <div className="mb-6">
                <Link href="/suppliers" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to Suppliers
                </Link>
                <h1 className="text-3xl font-bold text-[#3E2723]">Add New Supplier</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card title="Basic Information">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Supplier Name *</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#8D6E63]"
                                placeholder="e.g., ABC Electronics Ltd."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Contact Person</label>
                            <input
                                type="text"
                                value={formData.contactPerson}
                                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#8D6E63]"
                                placeholder="e.g., John Doe"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#8D6E63]"
                                placeholder="supplier@example.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
                            <input
                                type="tel"
                                required
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#8D6E63]"
                                placeholder="+1 234 567 8900"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                            <textarea
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#8D6E63]"
                                placeholder="Full address including city, state, and country"
                            />
                        </div>
                    </div>
                </Card>

                <Card title="Performance Metrics">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Lead Time (days)</label>
                            <input
                                type="number"
                                min="0"
                                value={formData.leadTime}
                                onChange={(e) => setFormData({ ...formData, leadTime: parseInt(e.target.value) })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#8D6E63]"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Initial Rating (0-5)</label>
                            <input
                                type="number"
                                min="0"
                                max="5"
                                step="0.1"
                                value={formData.rating}
                                onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#8D6E63]"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">On-Time Delivery (%)</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={formData.onTimeDelivery}
                                onChange={(e) => setFormData({ ...formData, onTimeDelivery: parseInt(e.target.value) })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#8D6E63]"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Defect Rate (%)</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={formData.defectRate}
                                onChange={(e) => setFormData({ ...formData, defectRate: parseFloat(e.target.value) })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#8D6E63]"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    className="w-4 h-4 text-[#8D6E63] rounded"
                                />
                                <label htmlFor="isActive" className="text-sm text-gray-700">Active Supplier</label>
                            </div>
                        </div>
                    </div>
                </Card>

                <div className="flex justify-end gap-4">
                    <Button type="button" variant="secondary" onClick={() => router.push('/suppliers')}>
                        Cancel
                    </Button>
                    <Button type="submit">Add Supplier</Button>
                </div>
            </form>
        </AppLayout>
    );
}
