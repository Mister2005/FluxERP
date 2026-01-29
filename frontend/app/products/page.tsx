'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Plus, Search, Filter } from 'lucide-react';

export default function ProductsPage() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }

        fetch(`${process.env.NEXT_PUBLIC_API_URL}/products`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                setProducts(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [router]);

    const columns = [
        { header: 'SKU', accessor: 'sku', className: 'font-medium text-gray-900' },
        { header: 'Name', accessor: 'name' },
        { header: 'Category', accessor: 'category' },
        {
            header: 'Status',
            accessor: (row: any) => (
                <Badge variant={row.status === 'active' ? 'success' : 'warning'}>
                    {row.status}
                </Badge>
            )
        },
        {
            header: 'Cost',
            accessor: (row: any) => `$${row.cost.toFixed(2)}`
        },
        {
            header: 'Actions',
            accessor: (row: any) => (
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); console.log('Edit', row.id); }}>
                    Edit
                </Button>
            )
        }
    ];

    return (
        <AppLayout>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#3E2723]">Products</h1>
                    <p className="text-gray-500">Manage your product catalog</p>
                </div>
                <Button icon={Plus} onClick={() => router.push('/products/new')}>Add Product</Button>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6 flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search products..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#8D6E63]"
                    />
                </div>
                <Button variant="secondary" icon={Filter}>Filter</Button>
            </div>

            <Table
                data={products}
                columns={columns}
                isLoading={loading}
                onRowClick={(row: any) => router.push(`/products/${row.id}`)}
            />
        </AppLayout>
    );
}
