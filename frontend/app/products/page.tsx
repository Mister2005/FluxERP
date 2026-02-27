'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Plus, Search, Filter, Edit } from 'lucide-react';

export default function ProductsPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [showFilters, setShowFilters] = useState(false);
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
                const items = Array.isArray(data) ? data : (data?.data || []);
                setProducts(Array.isArray(items) ? items : []);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [router]);

    const categories = useMemo(() => {
        const cats = new Set(products.map((p: any) => p.category).filter(Boolean));
        return Array.from(cats).sort();
    }, [products]);

    const filteredProducts = useMemo(() => {
        return products.filter((p: any) => {
            const search = searchTerm.toLowerCase();
            const matchesSearch = !search ||
                p.name?.toLowerCase().includes(search) ||
                p.sku?.toLowerCase().includes(search) ||
                p.category?.toLowerCase().includes(search) ||
                p.description?.toLowerCase().includes(search);
            const matchesCategory = !categoryFilter || p.category === categoryFilter;
            return matchesSearch && matchesCategory;
        });
    }, [products, searchTerm, categoryFilter]);

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
            accessor: (row: any) => `$${row.cost?.toFixed(2) || '0.00'}`
        },
        {
            header: 'Actions',
            accessor: (row: any) => (
                <Button variant="ghost" size="sm" icon={Edit} onClick={(e) => { e.stopPropagation(); router.push(`/products/${row.id}/edit`); }}>
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

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6 space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name, SKU, category..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#8D6E63]"
                        />
                    </div>
                    <Button variant="secondary" icon={Filter} onClick={() => setShowFilters(!showFilters)}>
                        Filter{categoryFilter ? ' (1)' : ''}
                    </Button>
                </div>
                {showFilters && (
                    <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100">
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#8D6E63]"
                        >
                            <option value="">All Categories</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        {categoryFilter && (
                            <button onClick={() => setCategoryFilter('')} className="text-sm text-[#8D6E63] hover:underline">Clear filters</button>
                        )}
                    </div>
                )}
            </div>

            <Table
                data={filteredProducts}
                columns={columns}
                isLoading={loading}
                onRowClick={(row: any) => router.push(`/products/${row.id}`)}
            />
        </AppLayout>
    );
}
