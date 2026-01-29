'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { ArrowLeft, Edit, Trash2, Plus } from 'lucide-react';
import Link from 'next/link';

export default function BOMDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [bom, setBom] = useState<any>(null);
    const [versions, setVersions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token || !params.id) return;

        fetch(`${process.env.NEXT_PUBLIC_API_URL}/boms/${params.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                setBom(data);
                setLoading(false);
                // Fetch versions
                return fetch(`${process.env.NEXT_PUBLIC_API_URL}/boms/${params.id}/versions`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            })
            .then(res => res?.json())
            .then(versionsData => {
                if (versionsData) setVersions(versionsData);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [params.id]);

    if (loading) {
        return (
            <AppLayout>
                <div className="flex items-center justify-center h-96">
                    <div className="spinner"></div>
                </div>
            </AppLayout>
        );
    }

    if (!bom) {
        return (
            <AppLayout>
                <div className="text-center py-12">BOM not found</div>
            </AppLayout>
        );
    }

    const tabs = [
        {
            id: 'details',
            label: 'Details',
            content: (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card title="BOM Information">
                        <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">BOM ID</dt>
                                <dd className="mt-1 text-sm text-gray-900">BOM-{bom.id.substring(0, 8).toUpperCase()}</dd>
                            </div>
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">Version</dt>
                                <dd className="mt-1 text-sm text-gray-900">{bom.version}</dd>
                            </div>
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">Status</dt>
                                <dd className="mt-1">
                                    <Badge variant={bom.status === 'active' ? 'success' : bom.status === 'obsolete' ? 'error' : 'warning'}>
                                        {bom.status}
                                    </Badge>
                                </dd>
                            </div>
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">Total Cost</dt>
                                <dd className="mt-1 text-sm text-gray-900">${bom.totalCost?.toFixed(2) || '0.00'}</dd>
                            </div>
                            <div className="sm:col-span-2">
                                <dt className="text-sm font-medium text-gray-500">Product</dt>
                                <dd className="mt-1 text-sm text-gray-900">{bom.product?.name || 'N/A'}</dd>
                            </div>
                        </dl>
                    </Card>

                    <Card title="Statistics">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Components</span>
                                <span className="text-lg font-semibold text-gray-900">{bom.components?.length || 0}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Operations</span>
                                <span className="text-lg font-semibold text-gray-900">{bom.operations?.length || 0}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Related ECOs</span>
                                <span className="text-lg font-semibold text-gray-900">{bom.ecos?.length || 0}</span>
                            </div>
                        </div>
                    </Card>
                </div>
            )
        },
        {
            id: 'components',
            label: 'Components',
            content: (
                <Card>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Component</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Cost</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {bom.components && bom.components.length > 0 ? (
                                    bom.components.map((comp: any) => (
                                        <tr key={comp.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{comp.product?.name || 'Unknown'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{comp.product?.sku || 'N/A'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{comp.quantity}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${comp.unitCost?.toFixed(2)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${(comp.quantity * comp.unitCost).toFixed(2)}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">No components added</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )
        },
        {
            id: 'operations',
            label: 'Operations',
            content: (
                <Card>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sequence</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operation</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Work Center</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration (min)</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {bom.operations && bom.operations.length > 0 ? (
                                    bom.operations.map((op: any) => (
                                        <tr key={op.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{op.sequence}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{op.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{op.workCenter}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{op.duration}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${op.cost?.toFixed(2)}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">No operations defined</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )
        },
        {
            id: 'versions',
            label: 'Versions',
            content: (
                <Card title="Version History">
                    <div className="space-y-4">
                        {versions.length > 0 ? (
                            versions.map((version: any) => (
                                <div
                                    key={version.id}
                                    className={`border rounded-lg p-4 ${version.id === bom.id ? 'border-[#8D6E63] bg-[#FAF8F6]' : 'border-gray-200'}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h4 className="font-semibold text-gray-900">
                                                    {version.version}
                                                    {version.isLatest && (
                                                        <Badge variant="success" className="ml-2">Latest</Badge>
                                                    )}
                                                    {version.id === bom.id && (
                                                        <Badge variant="info" className="ml-2">Current</Badge>
                                                    )}
                                                </h4>
                                                <Badge variant={
                                                    version.status === 'active' ? 'success' :
                                                        version.status === 'obsolete' ? 'error' : 'warning'
                                                }>
                                                    {version.status}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-gray-600 mb-2">{version.name}</p>
                                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                                <span>Components: {version.components?.length || 0}</span>
                                                <span>Operations: {version.operations?.length || 0}</span>
                                                <span>Cost: ${version.totalCost?.toFixed(2) || '0.00'}</span>
                                                <span>{new Date(version.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            {version.id !== bom.id && (
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => router.push(`/boms/${version.id}`)}
                                                >
                                                    View
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                No version history available.
                            </div>
                        )}
                    </div>
                </Card>
            )
        }
    ];

    return (
        <AppLayout>
            <div className="mb-6">
                <Link href="/boms" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to BOMs
                </Link>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-[#3E2723]">{bom.name}</h1>
                        <p className="text-gray-500">BOM-{bom.id.substring(0, 8).toUpperCase()}</p>
                    </div>

                    <div className="flex gap-3">
                        <Button variant="secondary" icon={Edit}>Edit</Button>
                        <Button variant="danger" icon={Trash2}>Delete</Button>
                    </div>
                </div>
            </div>

            <Tabs tabs={tabs} />
        </AppLayout>
    );
}
