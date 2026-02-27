'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { Edit, Trash2, ArrowLeft, Layers, FileText, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { Table } from '@/components/ui/Table';

export default function ProductDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token || !params.id) return;

        fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/${params.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch');
                return res.json();
            })
            .then(data => {
                setProduct(data?.data || data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [params.id]);

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) return;
        setDeleting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/${params.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || data.message || 'Failed to delete product');
            }
            router.push('/products');
        } catch (error: any) {
            alert(error.message || 'Failed to delete product');
        } finally {
            setDeleting(false);
        }
    };

    if (loading) {
        return (
            <AppLayout>
                <div className="flex items-center justify-center h-96">
                    <div className="spinner"></div>
                </div>
            </AppLayout>
        );
    }

    if (!product) {
        return (
            <AppLayout>
                <div className="text-center py-12">
                    <h2 className="text-xl font-semibold text-gray-900">Product not found</h2>
                    <Button variant="secondary" className="mt-4" onClick={() => router.back()}>
                        Go Back
                    </Button>
                </div>
            </AppLayout>
        );
    }

    const tabs = [
        {
            id: 'overview',
            label: 'Overview',
            content: (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card title="General Information">
                        <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">SKU</dt>
                                <dd className="mt-1 text-sm text-gray-900">{product.sku}</dd>
                            </div>
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">Category</dt>
                                <dd className="mt-1 text-sm text-gray-900">{product.category}</dd>
                            </div>
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">Status</dt>
                                <dd className="mt-1">
                                    <Badge variant={product.status === 'active' ? 'success' : 'warning'}>
                                        {product.status}
                                    </Badge>
                                </dd>
                            </div>
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                                <dd className="mt-1 text-sm text-gray-900">
                                    {new Date(product.updatedAt).toLocaleDateString()}
                                </dd>
                            </div>
                            <div className="sm:col-span-2">
                                <dt className="text-sm font-medium text-gray-500">Description</dt>
                                <dd className="mt-1 text-sm text-gray-900">
                                    {product.description || 'No description provided.'}
                                </dd>
                            </div>
                        </dl>
                    </Card>

                    <Card title="Inventory & Costing">
                        <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">Unit Cost</dt>
                                <dd className="mt-1 text-lg font-semibold text-gray-900">${product.cost?.toFixed(2)}</dd>
                            </div>
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">Stock Quantity</dt>
                                <dd className="mt-1 text-lg font-semibold text-gray-900">{product.quantity || 0} units</dd>
                            </div>
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">Supplier</dt>
                                <dd className="mt-1 text-sm text-gray-900">{product.supplier || 'Primary Supplier Inc.'}</dd>
                            </div>
                        </dl>
                    </Card>
                </div>
            )
        },
        {
            id: 'boms',
            label: 'Bill of Materials',
            content: (
                <Card>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium text-gray-900 flex items-center">
                            <Layers className="w-5 h-5 mr-2 text-gray-400" />
                            BOM Revisions
                        </h3>
                        <Button size="sm" variant="secondary">Create BOM</Button>
                    </div>
                    {product.boms && product.boms.length > 0 ? (
                        <Table
                            data={product.boms}
                            columns={[
                                { header: 'Revision', accessor: 'revision' },
                                { header: 'Status', accessor: 'status' }, // Assuming BOM has status
                                { header: 'Updated', accessor: (row: any) => new Date(row.updatedAt).toLocaleDateString() }
                            ]}
                        />
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            No BOMs found for this product.
                        </div>
                    )}
                </Card>
            )
        },
        {
            id: 'ecos',
            label: 'ECO History',
            content: (
                <Card>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium text-gray-900 flex items-center">
                            <FileText className="w-5 h-5 mr-2 text-gray-400" />
                            Engineering Changes
                        </h3>
                        <Button size="sm" variant="secondary">Create ECO</Button>
                    </div>
                    {product.ecos && product.ecos.length > 0 ? (
                        <Table
                            data={product.ecos}
                            columns={[
                                { header: 'Title', accessor: 'title' },
                                { header: 'Status', accessor: (row: any) => <Badge variant="info">{row.status}</Badge> },
                                { header: 'Priority', accessor: 'priority' }
                            ]}
                        />
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            No Engineering Change Orders found.
                        </div>
                    )}
                </Card>
            )
        }
    ];

    return (
        <AppLayout>
            <div className="mb-6">
                <Link href="/products" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to Products
                </Link>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h1 className="text-3xl font-bold text-[#3E2723]">{product.name}</h1>
                    <div className="flex gap-3">
                        <Button variant="danger" icon={Trash2} onClick={handleDelete} isLoading={deleting}>Delete</Button>
                    </div>
                </div>
            </div>

            <Tabs tabs={tabs} />
        </AppLayout>
    );
}
