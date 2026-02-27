'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table } from '@/components/ui/Table';
import { Plus, Search } from 'lucide-react';
import { usePermissions } from '@/lib/permissions';
import AccessDenied from '@/components/ui/AccessDenied';

export default function SuppliersPage() {
    const { can, loading: permLoading } = usePermissions();
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }

        fetch(`${process.env.NEXT_PUBLIC_API_URL}/suppliers`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                const items = Array.isArray(data) ? data : (data?.data || []);
                if (Array.isArray(items)) {
                    setSuppliers(items);
                } else {
                    console.error('Expected array of suppliers but got:', data);
                    setSuppliers([]);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [router]);

    const getRatingColor = (rating: number | null | undefined) => {
        if (rating === null || rating === undefined) return 'text-gray-400';
        if (rating >= 4.5) return 'text-green-600';
        if (rating >= 3.5) return 'text-yellow-600';
        return 'text-red-600';
    };

    const filteredSuppliers = suppliers.filter((supplier: any) => {
        const search = searchTerm.toLowerCase();
        return (
            supplier.name?.toLowerCase().includes(search) ||
            supplier.contactPerson?.toLowerCase().includes(search) ||
            supplier.email?.toLowerCase().includes(search)
        );
    });

    const columns = [
        {
            header: 'Supplier ID',
            accessor: (row: any) => <span className="font-medium text-gray-900 u-mono">SUP-{row.id.substring(0, 8).toUpperCase()}</span>
        },
        { header: 'Name', accessor: 'name' },
        { 
            header: 'Contact Person', 
            accessor: (row: any) => row.contactPerson || <span className="text-gray-400">—</span>
        },
        { 
            header: 'Email', 
            accessor: (row: any) => row.email || <span className="text-gray-400">—</span>
        },
        { 
            header: 'Phone', 
            accessor: (row: any) => row.phone || <span className="text-gray-400">—</span>
        },
        {
            header: 'Rating',
            accessor: (row: any) => (
                <span className={`font-semibold ${getRatingColor(row.rating)}`}>
                    {row.rating !== null && row.rating !== undefined ? `${row.rating.toFixed(1)} ⭐` : '—'}
                </span>
            )
        },
        {
            header: 'Lead Time',
            accessor: (row: any) => `${row.leadTimeDays || 0} days`
        },
        {
            header: 'On-Time %',
            accessor: (row: any) => (
                <span className={`font-medium ${(row.onTimeDeliveryRate || 0) >= 0.9 ? 'text-green-600' : 'text-yellow-600'}`}>
                    {((row.onTimeDeliveryRate || 0) * 100).toFixed(1)}%
                </span>
            )
        },
        {
            header: 'Status',
            accessor: (row: any) => (
                <Badge variant={row.isActive !== false ? 'success' : 'error'}>
                    {row.isActive !== false ? 'Active' : 'Inactive'}
                </Badge>
            )
        },
        {
            header: 'Actions',
            accessor: (row: any) => (
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); router.push(`/suppliers/${row.id}`) }}>
                    View
                </Button>
            )
        }
    ];
    // Permission check (after all hooks)
    if (!permLoading && !can('suppliers.read')) {
        return <AccessDenied feature="Suppliers" />;
    }
    return (
        <AppLayout>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#3E2723]">Suppliers</h1>
                    <p className="text-gray-500">Manage supplier relationships and performance</p>
                </div>
                <Button icon={Plus} onClick={() => router.push('/suppliers/new')}>Add Supplier</Button>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6 flex gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search suppliers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#8D6E63]"
                    />
                </div>
            </div>

            <Table
                data={filteredSuppliers}
                columns={columns}
                isLoading={loading}
                onRowClick={(row: any) => router.push(`/suppliers/${row.id}`)}
            />
        </AppLayout>
    );
}
