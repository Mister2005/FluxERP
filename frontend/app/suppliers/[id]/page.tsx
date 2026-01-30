'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { ArrowLeft, Edit, Trash2, Mail, Phone, MapPin, User } from 'lucide-react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function SupplierDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [supplier, setSupplier] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token || !params.id) return;

        fetch(`${process.env.NEXT_PUBLIC_API_URL}/suppliers/${params.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                setSupplier(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [params.id]);

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this supplier? This action cannot be undone.')) {
            return;
        }

        setDeleting(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/suppliers/${params.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                router.push('/suppliers');
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to delete supplier');
            }
        } catch (err) {
            console.error(err);
            alert('Error deleting supplier');
        } finally {
            setDeleting(false);
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

    if (!supplier) {
        return (
            <AppLayout>
                <div className="text-center py-12">Supplier not found</div>
            </AppLayout>
        );
    }

    // Calculate performance metrics from defects
    const totalDefects = supplier.defects?.length || 0;
    const criticalDefects = supplier.defects?.filter((d: any) => d.severity === 'critical').length || 0;
    const majorDefects = supplier.defects?.filter((d: any) => d.severity === 'major').length || 0;

    const tabs = [
        {
            id: 'details',
            label: 'Details',
            content: (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card title="Supplier Information">
                        <dl className="space-y-4">
                            <div>
                                <dt className="text-sm font-medium text-gray-500">Supplier ID</dt>
                                <dd className="mt-1 text-sm text-gray-900">SUP-{supplier.id.substring(0, 8).toUpperCase()}</dd>
                            </div>
                            <div>
                                <dt className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                    <User className="w-4 h-4" /> Contact Person
                                </dt>
                                <dd className="mt-1 text-sm text-gray-900">{supplier.contactPerson || 'Not specified'}</dd>
                            </div>
                            <div>
                                <dt className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                    <Mail className="w-4 h-4" /> Email
                                </dt>
                                <dd className="mt-1 text-sm text-gray-900">{supplier.email || 'Not specified'}</dd>
                            </div>
                            <div>
                                <dt className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                    <Phone className="w-4 h-4" /> Phone
                                </dt>
                                <dd className="mt-1 text-sm text-gray-900">{supplier.phone || 'Not specified'}</dd>
                            </div>
                            <div>
                                <dt className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                    <MapPin className="w-4 h-4" /> Address
                                </dt>
                                <dd className="mt-1 text-sm text-gray-900">{supplier.address || 'Not specified'}</dd>
                            </div>
                            <div>
                                <dt className="text-sm font-medium text-gray-500">Status</dt>
                                <dd className="mt-1">
                                    <Badge variant={supplier.isActive !== false ? 'success' : 'error'}>
                                        {supplier.isActive !== false ? 'Active' : 'Inactive'}
                                    </Badge>
                                </dd>
                            </div>
                        </dl>
                    </Card>

                    <Card title="Performance Metrics">
                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-gray-700">Overall Rating</span>
                                    <span className="text-2xl font-bold text-[#8D6E63]">
                                        {supplier.rating !== null && supplier.rating !== undefined ? `${supplier.rating.toFixed(1)} ⭐` : 'N/A'}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                                <div>
                                    <p className="text-sm text-gray-500">Lead Time</p>
                                    <p className="text-xl font-bold text-gray-900">{supplier.leadTimeDays || 0} days</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">On-Time Delivery</p>
                                    <p className="text-xl font-bold text-green-600">
                                        {((supplier.onTimeDeliveryRate || 0) * 100).toFixed(1)}%
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Defect Rate</p>
                                    <p className="text-xl font-bold text-red-600">
                                        {((supplier.defectRate || 0) * 100).toFixed(2)}%
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Total Defects</p>
                                    <p className="text-xl font-bold text-gray-900">{totalDefects}</p>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            )
        },
        {
            id: 'defects',
            label: 'Defects',
            content: (
                <Card title="Defect History">
                    {supplier.defects && supplier.defects.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discovered</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {supplier.defects.map((defect: any) => (
                                        <tr key={defect.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">{defect.type}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Badge variant={
                                                    defect.severity === 'critical' ? 'error' :
                                                    defect.severity === 'major' ? 'warning' : 'default'
                                                }>
                                                    {defect.severity}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{defect.description}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {defect.product?.name || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(defect.discoveredAt).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Defect Summary</h4>
                                <div className="flex gap-6">
                                    <div>
                                        <span className="text-red-600 font-bold">{criticalDefects}</span>
                                        <span className="text-sm text-gray-500 ml-1">Critical</span>
                                    </div>
                                    <div>
                                        <span className="text-yellow-600 font-bold">{majorDefects}</span>
                                        <span className="text-sm text-gray-500 ml-1">Major</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-600 font-bold">{totalDefects - criticalDefects - majorDefects}</span>
                                        <span className="text-sm text-gray-500 ml-1">Minor</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 py-8">No defects recorded for this supplier.</p>
                    )}
                </Card>
            )
        }
    ];

    return (
        <AppLayout>
            <div className="mb-6">
                <Link href="/suppliers" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to Suppliers
                </Link>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-[#3E2723]">{supplier.name}</h1>
                        <p className="text-gray-500">SUP-{supplier.id.substring(0, 8).toUpperCase()}</p>
                    </div>

                    <div className="flex gap-3">
                        <Button variant="secondary" icon={Edit} onClick={() => router.push(`/suppliers/${params.id}/edit`)}>
                            Edit
                        </Button>
                        <Button variant="danger" icon={Trash2} onClick={handleDelete} isLoading={deleting}>
                            Delete
                        </Button>
                    </div>
                </div>
            </div>

            <Tabs tabs={tabs} />
        </AppLayout>
    );
}
