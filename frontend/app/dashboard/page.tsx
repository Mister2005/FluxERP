'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import DashboardCharts from '@/components/dashboard/DashboardCharts';
import { Package, Layers, FileText, Activity, ArrowUpRight, ArrowRight, Clock, AlertTriangle, TrendingDown } from 'lucide-react';
import Link from 'next/link';

interface ActivityItem {
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    timestamp: string;
    user: { name: string };
}

interface Insights {
    pendingECOs: Array<{ id: string; ecoNumber: string; title: string; product: { name: string } }>;
    delayedWorkOrders: Array<{ id: string; orderNumber: string; product: { name: string }; endDate: string }>;
    lowStockProducts: Array<{ id: string; name: string; sku: string; quantity: number }>;
}

export default function DashboardPage() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ products: 0, boms: 0, ecos: 0, workOrders: 0 });
    const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
    const [insights, setInsights] = useState<Insights>({ pendingECOs: [], delayedWorkOrders: [], lowStockProducts: [] });
    const [user, setUser] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');

        if (!token || !userData || userData === 'undefined') {
            router.push('/login');
            return;
        }

        try {
            setUser(JSON.parse(userData));
        } catch (e) {
            console.error('Invalid user data in localStorage');
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            router.push('/login');
            return;
        }

        // Fetch dashboard data from analytics endpoint
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/analytics/dashboard`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                if (data.counts) {
                    setStats({
                        products: data.counts.products || 0,
                        boms: data.counts.boms || 0,
                        ecos: data.counts.ecos || 0,
                        workOrders: data.counts.workOrders || 0
                    });
                }
                if (data.recentActivity) {
                    setRecentActivity(data.recentActivity);
                }
                if (data.insights) {
                    setInsights(data.insights);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error('Dashboard fetch error:', err);
                // Fallback to reports endpoint
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/reports/dashboard`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                    .then(res => res.json())
                    .then(response => {
                        const data = response.data || response;
                        if (data.counts) {
                            setStats({
                                products: data.counts.products || 0,
                                boms: data.counts.boms || 0,
                                ecos: data.counts.ecos || 0,
                                workOrders: data.counts.workOrders || 0
                            });
                        }
                        setLoading(false);
                    })
                    .catch(e => {
                        console.error('Reports fetch error:', e);
                        setLoading(false);
                    });
            });
    }, [router]);

    const formatTimeAgo = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    };

    const formatAction = (action: string, entityType: string) => {
        const actionMap: Record<string, string> = {
            'create': 'Created',
            'update': 'Updated',
            'delete': 'Deleted',
            'approve': 'Approved',
            'reject': 'Rejected',
            'status_change': 'Status changed'
        };
        return `${actionMap[action] || action} ${entityType}`;
    };

    const getActionBadge = (action: string) => {
        const variantMap: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
            'create': 'success',
            'update': 'info',
            'delete': 'error',
            'approve': 'success',
            'reject': 'error',
            'status_change': 'warning'
        };
        return variantMap[action] || 'default';
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FAF8F6]">
                <div className="spinner"></div>
            </div>
        );
    }

    const statCards = [
        { label: 'Total Products', value: stats.products, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Active BOMs', value: stats.boms, icon: Layers, color: 'text-green-600', bg: 'bg-green-50' },
        { label: 'Open ECOs', value: stats.ecos, icon: FileText, color: 'text-orange-600', bg: 'bg-orange-50' },
        { label: 'Work Orders', value: stats.workOrders, icon: Activity, color: 'text-purple-600', bg: 'bg-purple-50' },
    ];

    const hasInsights = insights.pendingECOs.length > 0 || insights.delayedWorkOrders.length > 0 || insights.lowStockProducts.length > 0;

    return (
        <AppLayout>
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-[#3E2723]">Dashboard</h1>
                <p className="text-gray-500">Welcome back, {user?.name}</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {statCards.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <Card key={index} className="transition-all hover:shadow-md">
                            <div className="flex items-center justify-between mb-4">
                                <div className={`p-3 rounded-lg ${stat.bg}`}>
                                    <Icon className={`w-6 h-6 ${stat.color}`} />
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                                <h3 className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</h3>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {/* Charts Section */}
            <DashboardCharts />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Quick Actions */}
                <div className="lg:col-span-2">
                    <Card title="Quick Actions">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Link href="/products/new" className="block">
                                <div className="group p-4 border border-gray-100 rounded-lg hover:border-[#8D6E63] hover:bg-[#EFEBE9] transition-all cursor-pointer">
                                    <div className="flex items-center justify-between mb-2">
                                        <Package className="w-5 h-5 text-gray-500 group-hover:text-[#8D6E63]" />
                                        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#8D6E63]" />
                                    </div>
                                    <h4 className="font-semibold text-gray-900 group-hover:text-[#3E2723]">New Product</h4>
                                    <p className="text-xs text-gray-500 mt-1">Create a new product record</p>
                                </div>
                            </Link>

                            <Link href="/ecos/new" className="block">
                                <div className="group p-4 border border-gray-100 rounded-lg hover:border-[#8D6E63] hover:bg-[#EFEBE9] transition-all cursor-pointer">
                                    <div className="flex items-center justify-between mb-2">
                                        <FileText className="w-5 h-5 text-gray-500 group-hover:text-[#8D6E63]" />
                                        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#8D6E63]" />
                                    </div>
                                    <h4 className="font-semibold text-gray-900 group-hover:text-[#3E2723]">Create ECO</h4>
                                    <p className="text-xs text-gray-500 mt-1">Initiate change request</p>
                                </div>
                            </Link>

                            <Link href="/work-orders/new" className="block">
                                <div className="group p-4 border border-gray-100 rounded-lg hover:border-[#8D6E63] hover:bg-[#EFEBE9] transition-all cursor-pointer">
                                    <div className="flex items-center justify-between mb-2">
                                        <Activity className="w-5 h-5 text-gray-500 group-hover:text-[#8D6E63]" />
                                        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#8D6E63]" />
                                    </div>
                                    <h4 className="font-semibold text-gray-900 group-hover:text-[#3E2723]">New Work Order</h4>
                                    <p className="text-xs text-gray-500 mt-1">Create production order</p>
                                </div>
                            </Link>
                        </div>
                    </Card>

                    <div className="mt-8">
                        <Card title="Recent Activity">
                            <div className="space-y-4">
                                {recentActivity.length > 0 ? (
                                    recentActivity.slice(0, 5).map((activity) => (
                                        <div key={activity.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 p-2 rounded-lg transition-colors">
                                            <div className="flex items-center">
                                                <div className={`w-2 h-2 rounded-full mr-3 ${
                                                    activity.action === 'create' ? 'bg-green-500' :
                                                    activity.action === 'delete' ? 'bg-red-500' :
                                                    activity.action === 'approve' ? 'bg-blue-500' :
                                                    'bg-yellow-500'
                                                }`}></div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {formatAction(activity.action, activity.entityType)}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        By {activity.user?.name || 'System'} • {formatTimeAgo(activity.timestamp)}
                                                    </p>
                                                </div>
                                            </div>
                                            <Badge variant={getActionBadge(activity.action)}>
                                                {activity.entityType}
                                            </Badge>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                        <p>No recent activity</p>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>
                </div>

                {/* System Status / AI Insights */}
                <div>
                    <Card title="Insights" className="h-full bg-gradient-to-br from-[#8D6E63] to-[#6D4C41] text-white border-none">
                        <div className="space-y-4">
                            {hasInsights ? (
                                <>
                                    {insights.pendingECOs.length > 0 && (
                                        <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
                                            <h4 className="font-semibold flex items-center mb-2">
                                                <FileText className="w-4 h-4 mr-2" />
                                                Pending ECOs ({insights.pendingECOs.length})
                                            </h4>
                                            <ul className="text-sm text-white/90 space-y-1">
                                                {insights.pendingECOs.slice(0, 2).map(eco => (
                                                    <li key={eco.id} className="truncate">
                                                        • {eco.ecoNumber}: {eco.title}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {insights.delayedWorkOrders.length > 0 && (
                                        <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
                                            <h4 className="font-semibold flex items-center mb-2">
                                                <AlertTriangle className="w-4 h-4 mr-2" />
                                                Overdue Work Orders ({insights.delayedWorkOrders.length})
                                            </h4>
                                            <ul className="text-sm text-white/90 space-y-1">
                                                {insights.delayedWorkOrders.slice(0, 2).map(wo => (
                                                    <li key={wo.id} className="truncate">
                                                        • {wo.orderNumber} - {wo.product?.name}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {insights.lowStockProducts.length > 0 && (
                                        <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
                                            <h4 className="font-semibold flex items-center mb-2">
                                                <TrendingDown className="w-4 h-4 mr-2" />
                                                Low Stock Alert ({insights.lowStockProducts.length})
                                            </h4>
                                            <ul className="text-sm text-white/90 space-y-1">
                                                {insights.lowStockProducts.slice(0, 2).map(p => (
                                                    <li key={p.id} className="truncate">
                                                        • {p.name} ({p.quantity} left)
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
                                    <h4 className="font-semibold flex items-center mb-2">
                                        <Activity className="w-4 h-4 mr-2" />
                                        All Clear
                                    </h4>
                                    <p className="text-sm text-white/90">
                                        No pending issues or alerts at this time. Your operations are running smoothly.
                                    </p>
                                </div>
                            )}

                            <Link href="/ai" className="block">
                                <Button variant="secondary" className="w-full bg-white/20 border-none text-white hover:bg-white/30">
                                    Ask AI Assistant
                                </Button>
                            </Link>
                        </div>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
