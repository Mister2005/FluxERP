'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

export default function EditSupplierPage() {
    const params = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        leadTimeDays: 14,
        defectRate: 0,
        onTimeDeliveryRate: 95,
        rating: '',
        isActive: true
    });

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token || !params.id) {
            router.push('/login');
            return;
        }

        fetch(`${process.env.NEXT_PUBLIC_API_URL}/suppliers/${params.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    alert('Supplier not found');
                    router.push('/suppliers');
                    return;
                }
                setFormData({
                    name: data.name || '',
                    contactPerson: data.contactPerson || '',
                    email: data.email || '',
                    phone: data.phone || '',
                    address: data.address || '',
                    leadTimeDays: data.leadTimeDays || 14,
                    defectRate: data.defectRate ? (data.defectRate * 100) : 0,
                    onTimeDeliveryRate: data.onTimeDeliveryRate ? (data.onTimeDeliveryRate * 100) : 95,
                    rating: data.rating !== null && data.rating !== undefined ? data.rating.toString() : '',
                    isActive: data.isActive !== undefined ? data.isActive : true
                });
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [params.id, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/suppliers/${params.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: formData.name,
                    contactPerson: formData.contactPerson || null,
                    email: formData.email || null,
                    phone: formData.phone || null,
                    address: formData.address || null,
                    leadTimeDays: formData.leadTimeDays,
                    defectRate: formData.defectRate / 100,
                    onTimeDeliveryRate: formData.onTimeDeliveryRate / 100,
                    rating: formData.rating ? parseFloat(formData.rating) : null,
                    isActive: formData.isActive
                })
            });

            if (response.ok) {
                router.push(`/suppliers/${params.id}`);
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to update supplier');
            }
        } catch (err) {
            console.error(err);
            alert('Error updating supplier');
        } finally {
            setSaving(false);
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
                <Link href={`/suppliers/${params.id}`} className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to Supplier
                </Link>
                <h1 className="text-3xl font-bold text-[#3E2723]">Edit Supplier</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card title="Basic Information">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Supplier Name *</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#8D6E63]"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Contact Person</label>
                            <input
                                type="text"
                                value={formData.contactPerson}
                                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#8D6E63]"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#8D6E63]"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#8D6E63]"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                            <textarea
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#8D6E63]"
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
                                value={formData.leadTimeDays}
                                onChange={(e) => setFormData({ ...formData, leadTimeDays: parseInt(e.target.value) || 0 })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#8D6E63]"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">On-Time Delivery Rate (%)</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={formData.onTimeDeliveryRate}
                                onChange={(e) => setFormData({ ...formData, onTimeDeliveryRate: parseFloat(e.target.value) || 0 })}
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
                                onChange={(e) => setFormData({ ...formData, defectRate: parseFloat(e.target.value) || 0 })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#8D6E63]"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Rating (0-5)</label>
                            <input
                                type="number"
                                min="0"
                                max="5"
                                step="0.1"
                                value={formData.rating}
                                onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#8D6E63]"
                                placeholder="Optional"
                            />
                        </div>
                    </div>
                </Card>

                <Card title="Status">
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="isActive"
                            checked={formData.isActive}
                            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                            className="w-4 h-4 text-[#8D6E63] rounded"
                        />
                        <label htmlFor="isActive" className="text-sm text-gray-700">Supplier is active</label>
                    </div>
                </Card>

                <div className="flex justify-end gap-4">
                    <Button type="button" variant="secondary" onClick={() => router.push(`/suppliers/${params.id}`)}>
                        Cancel
                    </Button>
                    <Button type="submit" isLoading={saving} icon={Save}>
                        Save Changes
                    </Button>
                </div>
            </form>
        </AppLayout>
    );
}
