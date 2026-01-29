'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useRouter } from 'next/navigation';
import { Save, X, Sparkles, AlertTriangle, Plus, Trash2 } from 'lucide-react';

interface ECOFormProps {
    initialData?: any;
    isEdit?: boolean;
}

interface Change {
    field: string;
    oldValue: string;
    newValue: string;
}

export default function ECOForm({ initialData, isEdit = false }: ECOFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [riskAnalysis, setRiskAnalysis] = useState<any>(() => {
        // Initialize with existing AI analysis if editing
        if (initialData?.aiRiskScore !== null && initialData?.aiRiskScore !== undefined) {
            let riskFactors: string[] = [];
            if (initialData.aiKeyRisks) {
                try {
                    riskFactors = JSON.parse(initialData.aiKeyRisks);
                } catch {}
            }
            return {
                riskScore: initialData.aiRiskScore,
                predictedDelay: initialData.aiPredictedDelay,
                riskFactors
            };
        }
        return null;
    });
    const [products, setProducts] = useState<any[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);

    const [formData, setFormData] = useState({
        title: initialData?.title || '',
        description: initialData?.description || '',
        reason: initialData?.reason || '',
        priority: initialData?.priority || 'medium',
        status: initialData?.status || 'draft',
        productId: initialData?.productId || '',
        type: initialData?.type || 'standard'
    });

    const [changes, setChanges] = useState<Change[]>(() => {
        if (!initialData?.proposedChanges) return [];
        try {
            const parsed = typeof initialData.proposedChanges === 'string'
                ? JSON.parse(initialData.proposedChanges)
                : initialData.proposedChanges;
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.error('Failed to parse changes:', e);
            return [];
        }
    });

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        fetch(`${process.env.NEXT_PUBLIC_API_URL}/products`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => setProducts(data))
            .catch(err => console.error('Failed to fetch products', err));

        if (initialData?.productId) {
            // Should fetch specific product if list is partial, but assuming list has it for now or fetch individual
            fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/${initialData.productId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(data => setSelectedProduct(data));
        }
    }, [initialData?.productId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        if (name === 'productId') {
            const prod = products.find(p => p.id === value);
            if (prod) {
                setSelectedProduct(prod);
                // Verify if we need full details, maybe list has enough
                // For now assume list has basic fields
            }
        }
    };

    const addChange = () => setChanges([...changes, { field: '', oldValue: '', newValue: '' }]);
    const removeChange = (index: number) => setChanges(changes.filter((_, i) => i !== index));

    const updateChange = (index: number, key: keyof Change, value: string) => {
        const newChanges = [...changes];
        newChanges[index][key] = value;

        // Auto-fill old value if field is selected and product is known
        if (key === 'field' && selectedProduct) {
            // Map common field names if needed or use direct property access
            const fieldMap: Record<string, string> = {
                'Cost': 'cost',
                'Supplier': 'supplier',
                'Description': 'description',
                'Status': 'status'
            };
            const prop = fieldMap[value] || value.toLowerCase();
            if (selectedProduct[prop] !== undefined) {
                newChanges[index].oldValue = String(selectedProduct[prop]);
            }
        }

        setChanges(newChanges);
    };

    const handleAnalyzeRisk = async () => {
        if (!formData.title || !formData.description || !formData.reason) {
            alert('Please enter a title, description, and reason to analyze risk.');
            return;
        }

        setAnalyzing(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ai/risk-score`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    changeRequest: {
                        title: formData.title,
                        description: formData.description,
                        reason: formData.reason,
                        priority: formData.priority,
                        changes: changes
                    }
                })
            });

            if (!res.ok) throw new Error('Analysis failed');
            const data = await res.json();
            setRiskAnalysis(data);
        } catch (error) {
            console.error(error);
            alert('Failed to analyze risk');
        } finally {
            setAnalyzing(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const url = isEdit
                ? `${process.env.NEXT_PUBLIC_API_URL}/ecos/${initialData.id}`
                : `${process.env.NEXT_PUBLIC_API_URL}/ecos`;

            const method = isEdit ? 'PUT' : 'POST';

            const payload = {
                ...formData,
                proposedChanges: changes,
                impactAnalysis: riskAnalysis // Save AI analysis if available
            };

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Failed to save ECO');

            router.push('/ecos');
            router.refresh();
        } catch (error) {
            console.error(error);
            alert('Failed to save ECO');
        } finally {
            setLoading(false);
        }
    };

    const commonFields = ['Cost', 'Supplier', 'Description', 'Inventory Level', 'Status', 'SKU'];

    return (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
                <Card title="Change Details">
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                required
                                className="w-full"
                                placeholder="e.g. Switch to new Motor Supplier"
                            />
                        </div>

                        {/* Target Product Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Target Product</label>
                            <select
                                name="productId"
                                value={formData.productId}
                                onChange={handleChange}
                                className="w-full"
                            >
                                <option value="">Select Product (Optional)</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                                <select
                                    name="priority"
                                    value={formData.priority}
                                    onChange={handleChange}
                                    className="w-full"
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                    <option value="critical">Critical</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    className="w-full"
                                    disabled={!isEdit}
                                >
                                    <option value="draft">Draft</option>
                                    <option value="in-review">In Review</option>
                                    <option value="approved">Approved</option>
                                    <option value="rejected">Rejected</option>
                                    <option value="implemented">Implemented</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows={4}
                                required
                                className="w-full"
                                placeholder="Detailed description of the change..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Change</label>
                            <textarea
                                name="reason"
                                value={formData.reason}
                                onChange={handleChange}
                                rows={3}
                                required
                                className="w-full"
                                placeholder="Why is this change necessary?"
                            />
                        </div>
                    </div>
                </Card>

                {/* Proposed Changes Section */}
                <Card title="Proposed Changes">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <p className="text-sm text-gray-500">Specify field-level changes. Old values allow AI risk checking.</p>
                            <Button type="button" size="sm" variant="secondary" icon={Plus} onClick={addChange}>Add Change</Button>
                        </div>

                        {changes.length === 0 ? (
                            <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                <p className="text-sm text-gray-500">No specific field changes added.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {changes.map((change, index) => (
                                    <div key={index} className="flex gap-2 items-start">
                                        <div className="flex-1">
                                            <input
                                                list={`fields-${index}`}
                                                type="text"
                                                placeholder="Field Name"
                                                value={change.field}
                                                onChange={(e) => updateChange(index, 'field', e.target.value)}
                                                className="w-full text-sm"
                                            />
                                            <datalist id={`fields-${index}`}>
                                                {commonFields.map(f => <option key={f} value={f} />)}
                                            </datalist>
                                        </div>
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                placeholder="Old Value"
                                                value={change.oldValue}
                                                onChange={(e) => updateChange(index, 'oldValue', e.target.value)}
                                                className="w-full text-sm bg-red-50 text-red-700 border-red-200"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                placeholder="New Value"
                                                value={change.newValue}
                                                onChange={(e) => updateChange(index, 'newValue', e.target.value)}
                                                className="w-full text-sm bg-green-50 text-green-700 border-green-200"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeChange(index)}
                                            className="p-2 text-gray-400 hover:text-red-500"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            <div className="lg:col-span-1 space-y-6">
                <Card title="AI Risk Assessment">
                    <div className="space-y-4">
                        <p className="text-sm text-gray-500">
                            Analyze the potential impact and risk of this change using AI before submitting.
                        </p>

                        {!riskAnalysis ? (
                            <Button
                                type="button"
                                onClick={handleAnalyzeRisk}
                                isLoading={analyzing}
                                className="w-full bg-gradient-to-r from-[#8D6E63] to-[#6D4C41]"
                                icon={Sparkles}
                            >
                                Analyze Risk
                            </Button>
                        ) : (
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-700">Risk Score</span>
                                    <Badge variant={riskAnalysis.riskScore > 70 ? 'error' : riskAnalysis.riskScore > 40 ? 'warning' : 'success'}>
                                        {riskAnalysis.riskScore}/100
                                    </Badge>
                                </div>
                                {riskAnalysis.riskFactors && riskAnalysis.riskFactors.length > 0 && (
                                    <div className="mb-3">
                                        <p className="text-xs font-semibold text-gray-600 mb-1">Risk Factors:</p>
                                        <ul className="text-xs text-gray-500 list-disc pl-4 space-y-1">
                                            {riskAnalysis.riskFactors.map((factor: string, i: number) => (
                                                <li key={i}>{factor}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={handleAnalyzeRisk}
                                    isLoading={analyzing}
                                    className="w-full text-xs"
                                >
                                    Re-analyze
                                </Button>
                            </div>
                        )}
                    </div>
                </Card>

                <Card className="sticky top-24">
                    <h3 className="font-medium text-gray-900 mb-4">Actions</h3>
                    <div className="space-y-3">
                        <Button type="submit" isLoading={loading} className="w-full" icon={Save}>
                            {isEdit ? 'Update ECO' : 'Create ECO'}
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            className="w-full"
                            icon={X}
                            onClick={() => router.back()}
                        >
                            Cancel
                        </Button>
                    </div>
                </Card>
            </div>
        </form>
    );
}
