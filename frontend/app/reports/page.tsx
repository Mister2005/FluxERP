'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Download, TrendingUp, TrendingDown, AlertCircle, Package, ClipboardList, Truck } from 'lucide-react';
import { usePermissions } from '@/lib/permissions';
import AccessDenied from '@/components/ui/AccessDenied';

interface DashboardData {
    summary: {
        totalProducts: number;
        activeBOMs: number;
        activeECOs: number;
        activeWorkOrders: number;
        activeSuppliers: number;
    };
    ecosByStatus: Record<string, number>;
    workOrdersByStatus: Record<string, number>;
    recentActivity: {
        ecos: any[];
        workOrders: any[];
    };
}

interface EcoSummary {
    total: number;
    byStatus: { status: string; count: number }[];
    byPriority: { priority: string; count: number }[];
    byType: { type: string; count: number }[];
    averageProcessingDays: number;
}

interface ProductionData {
    byStatus: { status: string; count: number }[];
    byPriority: { priority: string; count: number }[];
    metrics: {
        onTimeCompletionRate: string;
        scrapRate: string;
        reworkRate: string;
        upcomingOrders: number;
    };
}

interface SupplierQuality {
    suppliers: {
        id: string;
        name: string;
        leadTimeDays: number;
        defectRate: number;
        onTimeDeliveryRate: number;
        defectCount: number;
    }[];
    defectsBySeverity: { severity: string; count: number }[];
    averageOnTimeDeliveryRate: string;
}

export default function ReportsPage() {
    const { can, loading: permLoading } = usePermissions();
    const [loading, setLoading] = useState(true);
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);
    const [ecoSummary, setEcoSummary] = useState<EcoSummary | null>(null);
    const [production, setProduction] = useState<ProductionData | null>(null);
    const [supplierQuality, setSupplierQuality] = useState<SupplierQuality | null>(null);
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }

        const headers = { 'Authorization': `Bearer ${token}` };
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;

        Promise.all([
            fetch(`${apiUrl}/reports/dashboard`, { headers }).then(r => r.json()),
            fetch(`${apiUrl}/reports/eco-summary`, { headers }).then(r => r.json()),
            fetch(`${apiUrl}/reports/production`, { headers }).then(r => r.json()),
            fetch(`${apiUrl}/reports/supplier-quality`, { headers }).then(r => r.json()),
        ])
            .then(([dashRes, ecoRes, prodRes, suppRes]) => {
                setDashboard(dashRes?.data || dashRes);
                setEcoSummary(ecoRes?.data || ecoRes);
                setProduction(prodRes?.data || prodRes);
                setSupplierQuality(suppRes?.data || suppRes);
                setLoading(false);
            })
            .catch(err => {
                console.error('Reports fetch error:', err);
                setLoading(false);
            });
    }, [router]);

    // Build chart data from real API responses
    const ecoStatusData = ecoSummary?.byStatus?.map(s => ({
        name: s.status,
        count: s.count,
    })) || [];

    const workOrderStatusData = production?.byStatus?.map(s => ({
        name: s.status.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()).replace(/-/g, ' '),
        value: s.count,
    })) || [];

    const supplierPerformanceData = supplierQuality?.suppliers?.slice(0, 8).map(s => ({
        name: s.name.length > 15 ? s.name.substring(0, 15) + '…' : s.name,
        onTime: s.onTimeDeliveryRate,
        defectRate: s.defectRate,
    })) || [];

    const COLORS = ['#3B82F6', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6', '#6366F1'];

    // Build recent activity from dashboard data
    const recentActivity: { color: string; title: string; description: string; time: string }[] = [];
    if (dashboard?.recentActivity?.ecos) {
        dashboard.recentActivity.ecos.forEach((eco: any) => {
            recentActivity.push({
                color: eco.status === 'Completed' ? 'bg-green-500' : eco.status === 'Submitted' ? 'bg-blue-500' : 'bg-yellow-500',
                title: `ECO ${eco.status}`,
                description: `${eco.title} — ${eco.product?.name || eco.product?.sku || 'N/A'}`,
                time: formatRelativeTime(eco.createdAt),
            });
        });
    }
    if (dashboard?.recentActivity?.workOrders) {
        dashboard.recentActivity.workOrders.forEach((wo: any) => {
            recentActivity.push({
                color: wo.status === 'completed' ? 'bg-green-500' : wo.status === 'in-progress' ? 'bg-yellow-500' : 'bg-blue-500',
                title: `Work Order ${wo.status.replace(/-/g, ' ')}`,
                description: `${wo.name} — ${wo.product?.name || wo.product?.sku || 'N/A'}`,
                time: formatRelativeTime(wo.scheduledStart || wo.createdAt),
            });
        });
    }
    // Sort by most recent first and take top 5
    recentActivity.sort((a, b) => 0); // already ordered from API

    // Permission check (after all hooks)
    if (!permLoading && !can('reports.read')) {
        return <AccessDenied feature="Reports" />;
    }

    const totalWorkOrders = workOrderStatusData.reduce((sum, s) => sum + s.value, 0);
    const activeWOs = dashboard?.summary?.activeWorkOrders ?? 0;
    const avgEcoCycleTime = ecoSummary?.averageProcessingDays ?? 0;
    const avgOnTimeRate = supplierQuality?.averageOnTimeDeliveryRate ?? '0%';

    return (
        <AppLayout>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#3E2723]">Reports & Analytics</h1>
                    <p className="text-gray-500">Comprehensive insights and performance metrics</p>
                </div>
                <Button icon={Download}>Export Report</Button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-96">
                    <div className="spinner"></div>
                </div>
            ) : (
                <>
                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <Card>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Total Products</p>
                                    <p className="text-2xl font-bold text-gray-900">{dashboard?.summary?.totalProducts ?? 0}</p>
                                </div>
                                <div className="p-3 bg-blue-100 rounded-lg">
                                    <Package className="w-6 h-6 text-blue-600" />
                                </div>
                            </div>
                            <div className="mt-2 flex items-center text-sm text-gray-500">
                                <span>{dashboard?.summary?.activeBOMs ?? 0} active BOMs</span>
                            </div>
                        </Card>

                        <Card>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Active Work Orders</p>
                                    <p className="text-2xl font-bold text-gray-900">{activeWOs}</p>
                                </div>
                                <div className="p-3 bg-yellow-100 rounded-lg">
                                    <ClipboardList className="w-6 h-6 text-yellow-600" />
                                </div>
                            </div>
                            <div className="mt-2 flex items-center text-sm text-gray-600">
                                <span>{totalWorkOrders} total work orders</span>
                            </div>
                        </Card>

                        <Card>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Avg ECO Cycle Time</p>
                                    <p className="text-2xl font-bold text-gray-900">{avgEcoCycleTime} days</p>
                                </div>
                                <div className="p-3 bg-green-100 rounded-lg">
                                    <TrendingDown className="w-6 h-6 text-green-600" />
                                </div>
                            </div>
                            <div className="mt-2 flex items-center text-sm text-gray-600">
                                <span>{ecoSummary?.total ?? 0} total ECOs</span>
                            </div>
                        </Card>

                        <Card>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Supplier On-Time Rate</p>
                                    <p className="text-2xl font-bold text-gray-900">{avgOnTimeRate}</p>
                                </div>
                                <div className="p-3 bg-purple-100 rounded-lg">
                                    <Truck className="w-6 h-6 text-purple-600" />
                                </div>
                            </div>
                            <div className="mt-2 flex items-center text-sm text-gray-600">
                                <span>{dashboard?.summary?.activeSuppliers ?? 0} suppliers</span>
                            </div>
                        </Card>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        <Card title="ECO Status Distribution">
                            {ecoStatusData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={ecoStatusData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis allowDecimals={false} />
                                        <Tooltip />
                                        <Bar dataKey="count" fill="#8D6E63" name="Count" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-[300px] flex items-center justify-center text-gray-400">No ECO data available</div>
                            )}
                        </Card>

                        <Card title="Work Order Distribution">
                            {workOrderStatusData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={workOrderStatusData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                                            outerRadius={100}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {workOrderStatusData.map((_entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-[300px] flex items-center justify-center text-gray-400">No work order data available</div>
                            )}
                        </Card>
                    </div>

                    {/* Production Metrics */}
                    {production?.metrics && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                            <Card>
                                <p className="text-sm text-gray-500">On-Time Completion</p>
                                <p className="text-xl font-bold text-green-600">{production.metrics.onTimeCompletionRate}</p>
                            </Card>
                            <Card>
                                <p className="text-sm text-gray-500">Scrap Rate</p>
                                <p className="text-xl font-bold text-red-600">{production.metrics.scrapRate}</p>
                            </Card>
                            <Card>
                                <p className="text-sm text-gray-500">Rework Rate</p>
                                <p className="text-xl font-bold text-yellow-600">{production.metrics.reworkRate}</p>
                            </Card>
                            <Card>
                                <p className="text-sm text-gray-500">Upcoming Orders (7d)</p>
                                <p className="text-xl font-bold text-blue-600">{production.metrics.upcomingOrders}</p>
                            </Card>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-6">
                        <Card title="Supplier Performance">
                            {supplierPerformanceData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={supplierPerformanceData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="onTime" fill="#8D6E63" name="On-Time Delivery %" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="defectRate" fill="#D32F2F" name="Defect Rate %" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-[300px] flex items-center justify-center text-gray-400">No supplier data available</div>
                            )}
                        </Card>
                    </div>

                    {/* Recent Activity */}
                    <div className="mt-8">
                        <Card title="Recent Activity">
                            {recentActivity.length > 0 ? (
                                <div className="space-y-4">
                                    {recentActivity.slice(0, 6).map((item, idx) => (
                                        <div key={idx} className={`flex items-start gap-4 ${idx < recentActivity.length - 1 ? 'pb-4 border-b border-gray-100' : ''}`}>
                                            <div className={`w-2 h-2 ${item.color} rounded-full mt-2`}></div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-gray-900">{item.title}</p>
                                                <p className="text-sm text-gray-500">{item.description}</p>
                                                <p className="text-xs text-gray-400 mt-1">{item.time}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-400 text-sm">No recent activity</p>
                            )}
                        </Card>
                    </div>
                </>
            )}
        </AppLayout>
    );
}

function formatRelativeTime(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
}
