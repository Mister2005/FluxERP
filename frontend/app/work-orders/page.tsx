'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Plus, Calendar, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface WorkOrder {
    id: string;
    name?: string;
    status: string;
    priority: string;
    quantity: number;
    progress?: number;
    scheduledStart?: string;
    scheduledEnd?: string;
    plannedEnd?: string;
    product?: { id: string; name: string; sku: string };
    bom?: { id: string; name: string; version: string };
}

export default function WorkOrdersPage() {
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }

        fetch(`${process.env.NEXT_PUBLIC_API_URL}/workorders`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setWorkOrders(data);
                } else {
                    console.error('Expected array of work orders but got:', data);
                    setWorkOrders([]);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [router]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'planned': return 'bg-blue-100 text-blue-800';
            case 'in_progress': return 'bg-yellow-100 text-yellow-800';
            case 'completed': return 'bg-green-100 text-green-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'text-red-600';
            case 'medium': return 'text-yellow-600';
            case 'low': return 'text-green-600';
            default: return 'text-gray-600';
        }
    };

    const safeWorkOrders = Array.isArray(workOrders) ? workOrders : [];

    const groupedOrders = {
        planned: safeWorkOrders.filter((wo: any) => wo.status === 'planned'),
        in_progress: safeWorkOrders.filter((wo: any) => wo.status === 'in_progress'),
        completed: safeWorkOrders.filter((wo: any) => wo.status === 'completed'),
        cancelled: safeWorkOrders.filter((wo: any) => wo.status === 'cancelled')
    };

    const WorkOrderCard = ({ order }: { order: any }) => {
        const dueDate = order.scheduledEnd || order.plannedEnd;
        const orderName = order.name || order.product?.name || 'Unnamed Work Order';
        const orderProgress = order.progress || 0;
        
        return (
            <div
                className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/work-orders/${order.id}`)}
            >
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <h3 className="font-semibold text-gray-900">{orderName}</h3>
                        <p className="text-sm text-gray-500 u-mono">WO-{order.id.substring(0, 8).toUpperCase()}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(order.priority)}`}>
                        {order.priority}
                    </span>
                </div>

                <div className="space-y-2 text-sm">
                    <div className="flex items-center text-gray-600">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span>Due: {dueDate ? new Date(dueDate).toLocaleDateString() : 'Not set'}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                        <Clock className="w-4 h-4 mr-2" />
                        <span>Qty: {order.quantity}</span>
                    </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">{order.product?.name || 'N/A'}</span>
                        <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-[#8D6E63] h-2 rounded-full transition-all"
                                    style={{ width: `${orderProgress}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <AppLayout>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#3E2723]">Work Orders</h1>
                    <p className="text-gray-500">Manage production and manufacturing orders</p>
                </div>
                <div className="flex gap-3">
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('kanban')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'kanban' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                                }`}
                        >
                            Kanban
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                                }`}
                        >
                            List
                        </button>
                    </div>
                    <Button icon={Plus} onClick={() => router.push('/work-orders/new')}>Create Work Order</Button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-96">
                    <div className="spinner"></div>
                </div>
            ) : viewMode === 'kanban' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                            <h2 className="font-semibold text-gray-900">Planned</h2>
                            <span className="text-sm text-gray-500">({groupedOrders.planned.length})</span>
                        </div>
                        <div className="space-y-3">
                            {groupedOrders.planned.map((order: any) => (
                                <WorkOrderCard key={order.id} order={order} />
                            ))}
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                            <h2 className="font-semibold text-gray-900">In Progress</h2>
                            <span className="text-sm text-gray-500">({groupedOrders.in_progress.length})</span>
                        </div>
                        <div className="space-y-3">
                            {groupedOrders.in_progress.map((order: any) => (
                                <WorkOrderCard key={order.id} order={order} />
                            ))}
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <h2 className="font-semibold text-gray-900">Completed</h2>
                            <span className="text-sm text-gray-500">({groupedOrders.completed.length})</span>
                        </div>
                        <div className="space-y-3">
                            {groupedOrders.completed.map((order: any) => (
                                <WorkOrderCard key={order.id} order={order} />
                            ))}
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <h2 className="font-semibold text-gray-900">Cancelled</h2>
                            <span className="text-sm text-gray-500">({groupedOrders.cancelled.length})</span>
                        </div>
                        <div className="space-y-3">
                            {groupedOrders.cancelled.map((order: any) => (
                                <WorkOrderCard key={order.id} order={order} />
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <Card>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">WO ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {workOrders.map((order: any) => {
                                    const dueDate = order.scheduledEnd || order.plannedEnd;
                                    const orderName = order.name || order.product?.name || 'Unnamed';
                                    const orderProgress = order.progress || 0;
                                    
                                    return (
                                        <tr
                                            key={order.id}
                                            className="hover:bg-gray-50 cursor-pointer"
                                            onClick={() => router.push(`/work-orders/${order.id}`)}
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 u-mono">
                                                WO-{order.id.substring(0, 8).toUpperCase()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{orderName}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.product?.name || 'N/A'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.quantity}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Badge variant={
                                                    order.status === 'completed' ? 'success' :
                                                        order.status === 'in_progress' || order.status === 'in-progress' ? 'warning' :
                                                            order.status === 'cancelled' ? 'error' : 'default'
                                                }>
                                                    {order.status.replace('_', ' ')}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`text-sm font-medium ${getPriorityColor(order.priority)}`}>
                                                    {order.priority}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {dueDate ? new Date(dueDate).toLocaleDateString() : 'Not set'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-24 bg-gray-200 rounded-full h-2">
                                                        <div
                                                            className="bg-[#8D6E63] h-2 rounded-full"
                                                            style={{ width: `${orderProgress}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-gray-600">{orderProgress}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </AppLayout>
    );
}
