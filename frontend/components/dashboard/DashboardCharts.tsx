'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Card } from '@/components/ui/Card';
import { useEffect, useState } from 'react';

const COLORS = ['#8D6E63', '#A1887F', '#D7CCC8', '#6D4C41'];
const STATUS_COLORS: Record<string, string> = {
    'draft': '#D7CCC8',
    'in-review': '#FFA726',
    'approved': '#66BB6A',
    'rejected': '#EF5350',
    'completed': '#8D6E63'
};

export default function DashboardCharts() {
    const [ecoData, setEcoData] = useState<any[]>([]);
    const [productData, setProductData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                // Fetch ECOs
                const ecoRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ecos`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const ecos = await ecoRes.json();

                // Aggregate ECO Status
                const statusCount: Record<string, number> = {};
                ecos.forEach((eco: any) => {
                    statusCount[eco.status] = (statusCount[eco.status] || 0) + 1;
                });

                const formatEcoData = Object.keys(statusCount).map(status => ({
                    name: status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' '),
                    value: statusCount[status],
                    color: STATUS_COLORS[status] || '#8D6E63'
                }));

                // Use mock data if empty (for visualization demo)
                if (formatEcoData.length === 0) {
                    setEcoData([
                        { name: 'Draft', value: 3, color: STATUS_COLORS['draft'] },
                        { name: 'In Review', value: 5, color: STATUS_COLORS['in-review'] },
                        { name: 'Approved', value: 8, color: STATUS_COLORS['approved'] },
                        { name: 'Rejected', value: 1, color: STATUS_COLORS['rejected'] }
                    ]);
                } else {
                    setEcoData(formatEcoData);
                }

                // Fetch Products for Category breakdown
                const prodRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const products = await prodRes.json();

                // Aggregate Product Categories
                const catCount: Record<string, number> = {};
                products.forEach((prod: any) => {
                    const cat = prod.category || 'Uncategorized';
                    catCount[cat] = (catCount[cat] || 0) + 1;
                });

                const formatProdData = Object.keys(catCount).map((cat, index) => ({
                    name: cat,
                    count: catCount[cat]
                }));

                // Use mock data if empty
                if (formatProdData.length === 0) {
                    setProductData([
                        { name: 'Electronics', count: 12 },
                        { name: 'Mechanical', count: 8 },
                        { name: 'Assemblies', count: 5 },
                        { name: 'Raw Materials', count: 15 }
                    ]);
                } else {
                    setProductData(formatProdData);
                }

                setLoading(false);
            } catch (err) {
                console.error(err);
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* ECO Status Chart */}
            <Card title="ECO Status Distribution">
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={ecoData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {ecoData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            {/* Product Categories Chart */}
            <Card title="Products by Category">
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={productData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#6B7280', fontSize: 12 }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#6B7280', fontSize: 12 }}
                            />
                            <Tooltip
                                cursor={{ fill: '#FAF8F6' }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar dataKey="count" fill="#8D6E63" radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </Card>
        </div>
    );
}
