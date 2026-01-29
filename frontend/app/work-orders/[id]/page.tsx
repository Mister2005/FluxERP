'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { ArrowLeft, Edit, Trash2, Play, Pause, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function WorkOrderDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [workOrder, setWorkOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token || !params.id) return;

        fetch(`${process.env.NEXT_PUBLIC_API_URL}/workorders/${params.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                setWorkOrder(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [params.id]);

    const updateStatus = async (newStatus: string) => {
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/workorders/${params.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                const updated = await response.json();
                setWorkOrder(updated);
            }
        } catch (err) {
            console.error(err);
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

    if (!workOrder) {
        return (
            <AppLayout>
                <div className="text-center py-12">Work Order not found</div>
            </AppLayout>
        );
    }

    const tabs = [
        {
            id: 'details',
            label: 'Details',
            content: (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card title="Work Order Information">
                        <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">WO ID</dt>
                                <dd className="mt-1 text-sm text-gray-900">WO-{workOrder.id.substring(0, 8).toUpperCase()}</dd>
                            </div>
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">Status</dt>
                                <dd className="mt-1">
                                    <Badge variant={
                                        workOrder.status === 'completed' ? 'success' :
                                            workOrder.status === 'in_progress' ? 'warning' :
                                                workOrder.status === 'cancelled' ? 'error' : 'default'
                                    }>
                                        {workOrder.status.replace('_', ' ')}
                                    </Badge>
                                </dd>
                            </div>
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">Priority</dt>
                                <dd className="mt-1 text-sm text-gray-900 capitalize">{workOrder.priority}</dd>
                            </div>
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">Quantity</dt>
                                <dd className="mt-1 text-sm text-gray-900">{workOrder.quantity}</dd>
                            </div>
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">Start Date</dt>
                                <dd className="mt-1 text-sm text-gray-900">
                                    {workOrder.scheduledStart ? new Date(workOrder.scheduledStart).toLocaleDateString() : 'Not set'}
                                </dd>
                            </div>
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">Due Date</dt>
                                <dd className="mt-1 text-sm text-gray-900">
                                    {workOrder.scheduledEnd ? new Date(workOrder.scheduledEnd).toLocaleDateString() : 'Not set'}
                                </dd>
                            </div>
                            <div className="sm:col-span-2">
                                <dt className="text-sm font-medium text-gray-500">Product</dt>
                                <dd className="mt-1 text-sm text-gray-900">{workOrder.product?.name || 'N/A'}</dd>
                            </div>
                            <div className="sm:col-span-2">
                                <dt className="text-sm font-medium text-gray-500">BOM</dt>
                                <dd className="mt-1 text-sm text-gray-900">{workOrder.bom?.name || 'N/A'}</dd>
                            </div>
                        </dl>
                    </Card>

                    <Card title="Progress">
                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-700">Completion</span>
                                    <span className="text-sm font-medium text-gray-900">{workOrder.progress || 0}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div
                                        className="bg-[#8D6E63] h-3 rounded-full transition-all"
                                        style={{ width: `${workOrder.progress || 0}%` }}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                                <div>
                                    <p className="text-sm text-gray-500">Produced</p>
                                    <p className="text-2xl font-bold text-gray-900">{workOrder.producedQuantity || 0}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Remaining</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {workOrder.quantity - (workOrder.producedQuantity || 0)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            )
        },
        {
            id: 'operations',
            label: 'Operations',
            content: (
                <Card>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sequence</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Operation</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Work Center</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {workOrder.bom?.operations && workOrder.bom.operations.length > 0 ? (
                                    workOrder.bom.operations.map((op: any) => (
                                        <tr key={op.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{op.sequence}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{op.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{op.workCenter}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Badge variant="default">Pending</Badge>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{op.duration} min</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">No operations defined</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )
        },
        {
            id: 'materials',
            label: 'Materials',
            content: (
                <Card>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Component</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Required</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Available</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {workOrder.bom?.components && workOrder.bom.components.length > 0 ? (
                                    workOrder.bom.components.map((comp: any) => {
                                        const required = comp.quantity * workOrder.quantity;
                                        const available = comp.product?.stock || 0;
                                        const isAvailable = available >= required;

                                        return (
                                            <tr key={comp.id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {comp.product?.name || 'Unknown'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{required}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{available}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <Badge variant={isAvailable ? 'success' : 'error'}>
                                                        {isAvailable ? 'Available' : 'Shortage'}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">No components defined</td>
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
                <Link href="/work-orders" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to Work Orders
                </Link>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-[#3E2723]">{workOrder.name}</h1>
                        <p className="text-gray-500">WO-{workOrder.id.substring(0, 8).toUpperCase()}</p>
                    </div>

                    <div className="flex gap-3">
                        {workOrder.status === 'planned' && (
                            <Button icon={Play} onClick={() => updateStatus('in_progress')}>Start</Button>
                        )}
                        {workOrder.status === 'in_progress' && (
                            <>
                                <Button variant="secondary" icon={Pause} onClick={() => updateStatus('planned')}>Pause</Button>
                                <Button icon={CheckCircle} onClick={() => updateStatus('completed')}>Complete</Button>
                            </>
                        )}
                        <Button variant="secondary" icon={Edit}>Edit</Button>
                        <Button variant="danger" icon={Trash2}>Delete</Button>
                    </div>
                </div>
            </div>

            <Tabs tabs={tabs} />
        </AppLayout>
    );
}
