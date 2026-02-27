'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Plus, Calendar, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { usePermissions } from '@/lib/permissions';
import AccessDenied from '@/components/ui/AccessDenied';

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

const STATUS_COLUMNS = [
    { key: 'planned', label: 'Planned', color: 'bg-blue-500' },
    { key: 'in-progress', label: 'In Progress', color: 'bg-yellow-500' },
    { key: 'completed', label: 'Completed', color: 'bg-green-500' },
    { key: 'cancelled', label: 'Cancelled', color: 'bg-red-500' },
] as const;

export default function WorkOrdersPage() {
    const { can, loading: permLoading } = usePermissions();
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
    const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null);
    const [dropTarget, setDropTarget] = useState<string | null>(null);
    const [updating, setUpdating] = useState<string | null>(null);
    const isDragging = useRef(false);
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
                const items = Array.isArray(data) ? data : (data?.data || []);
                if (Array.isArray(items)) {
                    setWorkOrders(items);
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
            case 'in-progress': return 'bg-yellow-100 text-yellow-800';
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

    // --- Drag and Drop handlers ---
    const handleDragStart = (e: React.DragEvent, orderId: string) => {
        isDragging.current = true;
        setDraggedOrderId(orderId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', orderId);
        // Add a slight delay to make the drag image appear
        const target = e.currentTarget as HTMLElement;
        setTimeout(() => {
            target.style.opacity = '0.5';
        }, 0);
    };

    const handleDragEnd = (e: React.DragEvent) => {
        isDragging.current = false;
        setDraggedOrderId(null);
        setDropTarget(null);
        const target = e.currentTarget as HTMLElement;
        target.style.opacity = '1';
    };

    const handleDragOver = (e: React.DragEvent, statusKey: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDropTarget(statusKey);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        // Only clear if leaving the column entirely (not entering a child)
        const relatedTarget = e.relatedTarget as HTMLElement;
        const currentTarget = e.currentTarget as HTMLElement;
        if (!currentTarget.contains(relatedTarget)) {
            setDropTarget(null);
        }
    };

    const handleDrop = async (e: React.DragEvent, newStatus: string) => {
        e.preventDefault();
        setDropTarget(null);
        const orderId = e.dataTransfer.getData('text/plain');
        if (!orderId) return;

        const order = workOrders.find(wo => wo.id === orderId);
        if (!order || order.status === newStatus) {
            setDraggedOrderId(null);
            return;
        }

        // Optimistic update
        const previousOrders = [...workOrders];
        setWorkOrders(prev => prev.map(wo =>
            wo.id === orderId ? { ...wo, status: newStatus } : wo
        ));
        setDraggedOrderId(null);
        setUpdating(orderId);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/workorders/${orderId}/status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!res.ok) {
                // Revert on failure
                const errData = await res.json().catch(() => ({}));
                console.error('Failed to update status:', errData);
                setWorkOrders(previousOrders);
            }
        } catch (err) {
            console.error('Error updating work order status:', err);
            setWorkOrders(previousOrders);
        } finally {
            setUpdating(null);
        }
    };

    const safeWorkOrders = Array.isArray(workOrders) ? workOrders : [];

    const groupedOrders: Record<string, WorkOrder[]> = {};
    STATUS_COLUMNS.forEach(col => {
        groupedOrders[col.key] = safeWorkOrders.filter(wo => wo.status === col.key);
    });

    const WorkOrderCard = ({ order }: { order: WorkOrder }) => {
        const dueDate = order.scheduledEnd || order.plannedEnd;
        const orderName = order.name || order.product?.name || 'Unnamed Work Order';
        const orderProgress = order.progress || 0;
        const isUpdating = updating === order.id;
        const isBeingDragged = draggedOrderId === order.id;

        return (
            <div
                draggable
                onDragStart={(e) => handleDragStart(e, order.id)}
                onDragEnd={handleDragEnd}
                onClick={() => {
                    // Prevent navigation when dragging
                    if (!isDragging.current) {
                        router.push(`/work-orders/${order.id}`);
                    }
                }}
                className={`bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-all cursor-grab active:cursor-grabbing ${
                    isBeingDragged ? 'opacity-50 ring-2 ring-[#8D6E63]' : ''
                } ${isUpdating ? 'animate-pulse' : ''}`}
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

    // Permission check (after all hooks)
    if (!permLoading && !can('workorders.read')) {
        return <AccessDenied feature="Work Orders" />;
    }

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
                    {STATUS_COLUMNS.map(col => (
                        <div
                            key={col.key}
                            onDragOver={(e) => handleDragOver(e, col.key)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, col.key)}
                            className={`rounded-lg transition-colors min-h-[200px] ${
                                dropTarget === col.key ? 'bg-[#EFEBE9] ring-2 ring-[#8D6E63] ring-dashed' : ''
                            }`}
                        >
                            <div className="flex items-center gap-2 mb-4 px-1">
                                <div className={`w-3 h-3 rounded-full ${col.color}`}></div>
                                <h2 className="font-semibold text-gray-900">{col.label}</h2>
                                <span className="text-sm text-gray-500">({groupedOrders[col.key]?.length || 0})</span>
                            </div>
                            <div className="space-y-3">
                                {groupedOrders[col.key]?.map((order) => (
                                    <WorkOrderCard key={order.id} order={order} />
                                ))}
                                {groupedOrders[col.key]?.length === 0 && (
                                    <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                                        Drop here
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
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
                                                        order.status === 'in-progress' ? 'warning' :
                                                            order.status === 'cancelled' ? 'error' : 'default'
                                                }>
                                                    {order.status.replace(/-/g, ' ')}
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
