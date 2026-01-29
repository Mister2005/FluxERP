'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { ArrowLeft, Edit, Trash2, Mail, Phone, MapPin } from 'lucide-react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function SupplierDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [supplier, setSupplier] = useState<any>(null);
    const [loading, setLoading] = useState(true);

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

    // Mock performance data
    const performanceData = [
        { month: 'Jan', onTime: 95, defectRate: 2 },
        { month: 'Feb', onTime: 92, defectRate: 3 },
        { month: 'Mar', onTime: 98, defectRate: 1 },
        { month: 'Apr', onTime: 94, defectRate: 2 },
        { month: 'May', onTime: 96, defectRate: 1.5 },
        { month: 'Jun', onTime: 97, defectRate: 1 }
    ];

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
                                <dt className="text-sm font-medium text-gray-500">Contact Person</dt>
                                <dd className="mt-1 text-sm text-gray-900">{supplier.contactPerson || 'N/A'}</dd>
                            </div>
                            <div>
                                <dt className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                    <Mail className="w-4 h-4" /> Email
                                </dt>
                                <dd className="mt-1 text-sm text-gray-900">{supplier.email}</dd>
                            </div>
                            <div>
                                <dt className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                    <Phone className="w-4 h-4" /> Phone
                                </dt>
                                <dd className="mt-1 text-sm text-gray-900">{supplier.phone}</dd>
                            </div>
                            <div>
                                <dt className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                    <MapPin className="w-4 h-4" /> Address
                                </dt>
                                <dd className="mt-1 text-sm text-gray-900">{supplier.address || 'N/A'}</dd>
                            </div>
                            <div>
                                <dt className="text-sm font-medium text-gray-500">Status</dt>
                                <dd className="mt-1">
                                    <Badge variant={supplier.isActive ? 'success' : 'error'}>
                                        {supplier.isActive ? 'Active' : 'Inactive'}
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
                                    <span className="text-2xl font-bold text-[#8D6E63]">{supplier.rating?.toFixed(1) || 'N/A'} ⭐</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                                <div>
                                    <p className="text-sm text-gray-500">Lead Time</p>
                                    <p className="text-xl font-bold text-gray-900">{supplier.leadTime || 0} days</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">On-Time Delivery</p>
                                    <p className="text-xl font-bold text-green-600">{supplier.onTimeDelivery || 95}%</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Defect Rate</p>
                                    <p className="text-xl font-bold text-red-600">{supplier.defectRate || 2}%</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Total Orders</p>
                                    <p className="text-xl font-bold text-gray-900">{supplier.totalOrders || 0}</p>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            )
        },
        {
            id: 'performance',
            label: 'Performance',
            content: (
                <Card title="Performance Trends">
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-sm font-medium text-gray-700 mb-4">On-Time Delivery (%)</h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={performanceData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="onTime" fill="#8D6E63" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div>
                            <h3 className="text-sm font-medium text-gray-700 mb-4">Defect Rate (%)</h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={performanceData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="defectRate" fill="#D32F2F" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </Card>
            )
        },
        {
            id: 'products',
            label: 'Products',
            content: (
                <Card>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lead Time</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {supplier.products && supplier.products.length > 0 ? (
                                    supplier.products.map((product: any) => (
                                        <tr key={product.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.sku}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${product.price?.toFixed(2)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.leadTime || supplier.leadTime} days</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">No products associated</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
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
                        <Button variant="secondary" icon={Edit}>Edit</Button>
                        <Button variant="danger" icon={Trash2}>Delete</Button>
                    </div>
                </div>
            </div>

            <Tabs tabs={tabs} />
        </AppLayout>
    );
}
