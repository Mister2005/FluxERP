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
import { Download, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

export default function ReportsPage() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>({});
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }

        // Fetch analytics data
        Promise.all([
            fetch(`${process.env.NEXT_PUBLIC_API_URL}/analytics/eco-stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(res => res.json()),
            fetch(`${process.env.NEXT_PUBLIC_API_URL}/analytics/product-stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(res => res.json())
        ])
            .then(([ecoStats, productStats]) => {
                setStats({ ecoStats, productStats });
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [router]);

    // Mock data for charts
    const ecoTrendData = [
        { month: 'Jan', created: 12, completed: 10 },
        { month: 'Feb', created: 15, completed: 13 },
        { month: 'Mar', created: 18, completed: 16 },
        { month: 'Apr', created: 14, completed: 14 },
        { month: 'May', created: 20, completed: 17 },
        { month: 'Jun', created: 16, completed: 15 }
    ];

    const supplierPerformance = [
        { name: 'Supplier A', onTime: 95, defectRate: 2 },
        { name: 'Supplier B', onTime: 88, defectRate: 5 },
        { name: 'Supplier C', onTime: 92, defectRate: 3 },
        { name: 'Supplier D', onTime: 97, defectRate: 1 }
    ];

    const workOrderStatus = [
        { name: 'Planned', value: 15 },
        { name: 'In Progress', value: 25 },
        { name: 'Completed', value: 45 },
        { name: 'Cancelled', value: 5 }
    ];

    const COLORS = ['#3B82F6', '#F59E0B', '#10B981', '#EF4444'];

    return (
        <AppLayout>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#3E2723]">Reports & Analytics</h1>
                    <p className="text-gray-500">Comprehensive insights and performance metrics</p>
                </div>
                <Button icon={Download}>Export Report</Button>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Total ECOs</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.ecoStats?.total || 0}</p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <TrendingUp className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-green-600">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        <span>+12% from last month</span>
                    </div>
                </Card>

                <Card>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Active Work Orders</p>
                            <p className="text-2xl font-bold text-gray-900">25</p>
                        </div>
                        <div className="p-3 bg-yellow-100 rounded-lg">
                            <AlertCircle className="w-6 h-6 text-yellow-600" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-600">
                        <span>15 planned, 10 in progress</span>
                    </div>
                </Card>

                <Card>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Avg ECO Cycle Time</p>
                            <p className="text-2xl font-bold text-gray-900">8.5 days</p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-lg">
                            <TrendingDown className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-green-600">
                        <TrendingDown className="w-4 h-4 mr-1" />
                        <span>-15% improvement</span>
                    </div>
                </Card>

                <Card>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Supplier Avg Rating</p>
                            <p className="text-2xl font-bold text-gray-900">4.3 ⭐</p>
                        </div>
                        <div className="p-3 bg-purple-100 rounded-lg">
                            <TrendingUp className="w-6 h-6 text-purple-600" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-green-600">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        <span>+0.2 from last quarter</span>
                    </div>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <Card title="ECO Trends">
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={ecoTrendData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="created" stroke="#8D6E63" strokeWidth={2} />
                            <Line type="monotone" dataKey="completed" stroke="#4CAF50" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </Card>

                <Card title="Work Order Distribution">
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={workOrderStatus}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {workOrderStatus.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </Card>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <Card title="Supplier Performance">
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={supplierPerformance}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="onTime" fill="#8D6E63" name="On-Time Delivery %" />
                            <Bar dataKey="defectRate" fill="#D32F2F" name="Defect Rate %" />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>
            </div>

            {/* Recent Activity */}
            <div className="mt-8">
                <Card title="Recent Activity">
                    <div className="space-y-4">
                        <div className="flex items-start gap-4 pb-4 border-b border-gray-100">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">New ECO Created</p>
                                <p className="text-sm text-gray-500">ECO-2024-045 - Battery Upgrade</p>
                                <p className="text-xs text-gray-400 mt-1">2 hours ago</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4 pb-4 border-b border-gray-100">
                            <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">Work Order Completed</p>
                                <p className="text-sm text-gray-500">WO-2024-123 - Laptop Assembly</p>
                                <p className="text-xs text-gray-400 mt-1">5 hours ago</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">Supplier Rating Updated</p>
                                <p className="text-sm text-gray-500">Supplier A - Rating increased to 4.8</p>
                                <p className="text-xs text-gray-400 mt-1">1 day ago</p>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </AppLayout>
    );
}
