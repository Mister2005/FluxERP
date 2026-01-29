'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table } from '@/components/ui/Table';
import { Plus, Search } from 'lucide-react';

export default function SuppliersPage() {
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
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
                setSuppliers(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [router]);

    const getRatingColor = (rating: number) => {
        if (rating >= 4.5) return 'text-green-600';
        if (rating >= 3.5) return 'text-yellow-600';
        return 'text-red-600';
    };

    const columns = [
        {
            header: 'Supplier ID',
            accessor: (row: any) => <span className="font-medium text-gray-900 u-mono">SUP-{row.id.substring(0, 8).toUpperCase()}</span>
        },
        { header: 'Name', accessor: 'name' },
        { header: 'Contact Person', accessor: 'contactPerson' },
        { header: 'Email', accessor: 'email' },
        { header: 'Phone', accessor: 'phone' },
        {
            header: 'Rating',
            accessor: (row: any) => (
                <span className={`font-semibold ${getRatingColor(row.rating || 0)}`}>
                    {row.rating?.toFixed(1) || 'N/A'} ⭐
                </span>
            )
        },
        {
            header: 'Lead Time',
            accessor: (row: any) => `${row.leadTime || 0} days`
        },
        {
            header: 'Status',
            accessor: (row: any) => (
                <Badge variant={row.isActive ? 'success' : 'error'}>
                    {row.isActive ? 'Active' : 'Inactive'}
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
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#8D6E63]"
                    />
                </div>
            </div>

            <Table
                data={suppliers}
                columns={columns}
                isLoading={loading}
                onRowClick={(row: any) => router.push(`/suppliers/${row.id}`)}
            />
        </AppLayout>
    );
}
