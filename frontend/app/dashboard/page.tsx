'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import DashboardCharts from '@/components/dashboard/DashboardCharts';
import { Package, Layers, FileText, Activity, ArrowUpRight, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ products: 0, boms: 0, ecos: 0, workOrders: 0 });
    const [user, setUser] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');

        if (!token || !userData) {
            router.push('/login');
            return;
        }

        setUser(JSON.parse(userData));

        // Fetch dashboard stats from analytics endpoint
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
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                // Fallback to fetching products count
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/products`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                    .then(res => res.json())
                    .then(data => {
                        setStats(prev => ({ ...prev, products: data.length || 0 }));
                        setLoading(false);
                    })
                    .catch(console.error);
            });
    }, [router]);

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
                                <span className="flex items-center text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                                    <ArrowUpRight className="w-3 h-3 mr-1" />
                                    12%
                                </span>
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
                            <Link href="/products" className="block">
                                <div className="group p-4 border border-gray-100 rounded-lg hover:border-[#8D6E63] hover:bg-[#EFEBE9] transition-all cursor-pointer">
                                    <div className="flex items-center justify-between mb-2">
                                        <Package className="w-5 h-5 text-gray-500 group-hover:text-[#8D6E63]" />
                                        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#8D6E63]" />
                                    </div>
                                    <h4 className="font-semibold text-gray-900 group-hover:text-[#3E2723]">New Product</h4>
                                    <p className="text-xs text-gray-500 mt-1">Create a new product record</p>
                                </div>
                            </Link>

                            <Link href="/ecos" className="block">
                                <div className="group p-4 border border-gray-100 rounded-lg hover:border-[#8D6E63] hover:bg-[#EFEBE9] transition-all cursor-pointer">
                                    <div className="flex items-center justify-between mb-2">
                                        <FileText className="w-5 h-5 text-gray-500 group-hover:text-[#8D6E63]" />
                                        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#8D6E63]" />
                                    </div>
                                    <h4 className="font-semibold text-gray-900 group-hover:text-[#3E2723]">Create ECO</h4>
                                    <p className="text-xs text-gray-500 mt-1">Initiate change request</p>
                                </div>
                            </Link>

                            <Link href="/boms" className="block">
                                <div className="group p-4 border border-gray-100 rounded-lg hover:border-[#8D6E63] hover:bg-[#EFEBE9] transition-all cursor-pointer">
                                    <div className="flex items-center justify-between mb-2">
                                        <Layers className="w-5 h-5 text-gray-500 group-hover:text-[#8D6E63]" />
                                        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#8D6E63]" />
                                    </div>
                                    <h4 className="font-semibold text-gray-900 group-hover:text-[#3E2723]">Manage BOMs</h4>
                                    <p className="text-xs text-gray-500 mt-1">View bill of materials</p>
                                </div>
                            </Link>
                        </div>
                    </Card>

                    <div className="mt-8">
                        <Card title="Recent Activity">
                            <div className="space-y-4">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 p-2 rounded-lg transition-colors">
                                        <div className="flex items-center">
                                            <div className="w-2 h-2 rounded-full bg-blue-500 mr-3"></div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">ECO-{1000 + i} Status Update</p>
                                                <p className="text-xs text-gray-500">Updated by System Admin • 2h ago</p>
                                            </div>
                                        </div>
                                        <Badge variant="info">In Review</Badge>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                </div>

                {/* System Status / AI Insights */}
                <div>
                    <Card title="AI Insights" className="h-full bg-gradient-to-br from-[#8D6E63] to-[#6D4C41] text-white border-none">
                        <div className="space-y-6">
                            <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
                                <h4 className="font-semibold flex items-center mb-2">
                                    <Activity className="w-4 h-4 mr-2" />
                                    Risk Alert
                                </h4>
                                <p className="text-sm text-white/90">
                                    Detected potentail supply delay for Component X-100. Supplier lead time increased by 15%.
                                </p>
                            </div>

                            <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
                                <h4 className="font-semibold flex items-center mb-2">
                                    <Layers className="w-4 h-4 mr-2" />
                                    Optimization
                                </h4>
                                <p className="text-sm text-white/90">
                                    BOM structure for 'Motor Assembly' can be optimized to reduce cost by 5%.
                                </p>
                            </div>

                            <Button variant="secondary" className="w-full bg-white/20 border-none text-white hover:bg-white/30">
                                View All Insights
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
