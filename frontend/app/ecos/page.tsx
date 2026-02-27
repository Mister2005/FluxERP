'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table } from '@/components/ui/Table';
import { FileText, Plus, Search } from 'lucide-react';

export default function ECOsPage() {
    const [ecos, setEcos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }

        fetch(`${process.env.NEXT_PUBLIC_API_URL}/ecos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                const items = Array.isArray(data) ? data : (data?.data || []);
                setEcos(items);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [router]);

    const filteredEcos = useMemo(() => {
        const search = searchTerm.toLowerCase();
        if (!search) return ecos;
        return ecos.filter((eco: any) =>
            eco.title?.toLowerCase().includes(search) ||
            eco.status?.toLowerCase().includes(search) ||
            eco.priority?.toLowerCase().includes(search) ||
            eco.id?.toLowerCase().includes(search)
        );
    }, [ecos, searchTerm]);

    const columns = [
        {
            header: 'ECO #',
            accessor: (row: any) => <span className="font-medium text-gray-900 u-mono">ECO-{row.id.substring(0, 8).toUpperCase()}</span>
        },
        { header: 'Title', accessor: 'title', className: 'max-w-xs truncate' },
        {
            header: 'Status',
            accessor: (row: any) => (
                <Badge variant={
                    row.status === 'approved' ? 'success' :
                        row.status === 'rejected' ? 'error' :
                            row.status === 'implemented' ? 'info' :
                                'warning'
                }>
                    {row.status}
                </Badge>
            )
        },
        {
            header: 'Priority',
            accessor: (row: any) => (
                <span className={`text-xs font-semibold uppercase ${row.priority === 'critical' ? 'text-red-700' :
                        row.priority === 'high' ? 'text-orange-700' :
                            'text-gray-600'
                    }`}>
                    {row.priority}
                </span>
            )
        },
        { header: 'Created', accessor: (row: any) => new Date(row.createdAt).toLocaleDateString() },
        {
            header: 'Actions',
            accessor: (row: any) => (
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); router.push(`/ecos/${row.id}`) }}>
                    View
                </Button>
            )
        }
    ];

    return (
        <AppLayout>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#3E2723]">Engineering Change Orders</h1>
                    <p className="text-gray-500">Manage change requests and approvals</p>
                </div>
                <Button icon={Plus} onClick={() => router.push('/ecos/new')}>Create ECO</Button>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6 flex gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search ECOs by title, status, priority..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#8D6E63]"
                    />
                </div>
            </div>

            <Table
                data={filteredEcos}
                columns={columns}
                isLoading={loading}
                onRowClick={(row: any) => router.push(`/ecos/${row.id}`)}
            />
        </AppLayout>
    );
}
