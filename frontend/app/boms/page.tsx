'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table } from '@/components/ui/Table';
import { Plus, Search } from 'lucide-react';

export default function BOMsPage() {
    const [boms, setBoms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }

        fetch(`${process.env.NEXT_PUBLIC_API_URL}/boms`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                const items = Array.isArray(data) ? data : (data?.data || []);
                setBoms(items);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [router]);

    const filteredBoms = useMemo(() => {
        const search = searchTerm.toLowerCase();
        if (!search) return boms;
        return boms.filter((bom: any) =>
            bom.name?.toLowerCase().includes(search) ||
            bom.version?.toLowerCase().includes(search) ||
            bom.product?.name?.toLowerCase().includes(search) ||
            bom.product?.sku?.toLowerCase().includes(search) ||
            bom.id?.toLowerCase().includes(search)
        );
    }, [boms, searchTerm]);

    const columns = [
        { 
            header: 'BOM ID', 
            accessor: (row: any) => <span className="font-medium text-gray-900 u-mono">BOM-{row.id.substring(0, 8).toUpperCase()}</span>
        },
        { header: 'Name', accessor: 'name' },
        { 
            header: 'Product', 
            accessor: (row: any) => row.product?.name || 'N/A'
        },
        { header: 'Version', accessor: 'version' },
        { 
            header: 'Status', 
            accessor: (row: any) => (
                <Badge variant={
                    row.status === 'active' ? 'success' : 
                    row.status === 'obsolete' ? 'error' : 
                    'warning'
                }>
                    {row.status}
                </Badge>
            ) 
        },
        { 
            header: 'Components', 
            accessor: (row: any) => row.components?.length || 0
        },
        { 
            header: 'Total Cost', 
            accessor: (row: any) => `$${row.totalCost?.toFixed(2) || '0.00'}`
        },
        {
            header: 'Actions',
            accessor: (row: any) => (
               <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); router.push(`/boms/${row.id}`) }}>
                    View
                </Button>
            )
        }
    ];

    return (
        <AppLayout>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#3E2723]">Bill of Materials</h1>
                    <p className="text-gray-500">Manage product structures and components</p>
                </div>
                <Button icon={Plus} onClick={() => router.push('/boms/new')}>Create BOM</Button>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6 flex gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search by name, version, product..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#8D6E63]"
                    />
                </div>
            </div>

            <Table 
                data={filteredBoms} 
                columns={columns} 
                isLoading={loading}
                onRowClick={(row: any) => router.push(`/boms/${row.id}`)}
            />
        </AppLayout>
    );
}
