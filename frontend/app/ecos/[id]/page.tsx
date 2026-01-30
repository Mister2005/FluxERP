'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { ArrowLeft, CheckCircle, XCircle, Play, AlertTriangle, User, Calendar, MessageSquare, Send, Edit, Clock, Sparkles, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function ECODetailPage() {
    const params = useParams();
    const router = useRouter();
    const [eco, setEco] = useState<any>(null);
    const [versions, setVersions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [analyzingRisk, setAnalyzingRisk] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [commentLoading, setCommentLoading] = useState(false);

    const fetchECO = () => {
        const token = localStorage.getItem('token');
        if (!token || !params.id) return;

        fetch(`${process.env.NEXT_PUBLIC_API_URL}/ecos/${params.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch');
                return res.json();
            })
            .then(data => {
                setEco(data);
                setLoading(false);
                // Fetch versions
                return fetch(`${process.env.NEXT_PUBLIC_API_URL}/ecos/${params.id}/versions`, {
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
    };

    useEffect(() => {
        fetchECO();
    }, [params.id]);

    const handleAnalyzeRisk = async () => {
        if (!eco) return;
        
        setAnalyzingRisk(true);
        try {
            const token = localStorage.getItem('token');
            
            // Get risk analysis from AI
            const riskRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ai/risk-score`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    changeRequest: {
                        title: eco.title,
                        description: eco.description,
                        reason: eco.reason,
                        priority: eco.priority,
                        changes: (() => {
                            try {
                                return typeof eco.proposedChanges === 'string' 
                                    ? JSON.parse(eco.proposedChanges) 
                                    : eco.proposedChanges;
                            } catch {
                                return [];
                            }
                        })()
                    }
                })
            });

            if (!riskRes.ok) throw new Error('Risk analysis failed');
            const riskData = await riskRes.json();
            
            // Update the ECO with risk analysis - this will create a new version
            const updateRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ecos/${params.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    impactAnalysis: riskData
                })
            });

            if (!updateRes.ok) throw new Error('Failed to save risk analysis');
            
            const newEco = await updateRes.json();
            
            // If a new version was created, navigate to it
            if (newEco.id !== eco.id) {
                router.push(`/ecos/${newEco.id}`);
            } else {
                // Refresh current ECO data
                fetchECO();
            }
        } catch (error) {
            console.error(error);
            alert('Failed to analyze risk. Please try again.');
        } finally {
            setAnalyzingRisk(false);
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        if (!confirm(`Are you sure you want to change status to ${newStatus}?`)) return;

        setActionLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ecos/${params.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (!res.ok) throw new Error('Failed to update status');

            const updatedEco = await res.json();
            setEco(updatedEco);
        } catch (error) {
            console.error(error);
            alert('Failed to update status');
        } finally {
            setActionLoading(false);
        }
    };

    const handlePostComment = async () => {
        if (!newComment.trim()) return;
        setCommentLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ecos/${params.id}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ content: newComment })
            });

            if (!res.ok) throw new Error('Failed to post comment');

            setNewComment('');
            fetchECO(); // Refresh to see new comment
        } catch (error) {
            console.error(error);
            alert('Failed to post comment');
        } finally {
            setCommentLoading(false);
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

    if (!eco) {
        return (
            <AppLayout>
                <div className="text-center py-12">ECO not found</div>
            </AppLayout>
        );
    }

    const proposedChanges = (() => {
        if (!eco.proposedChanges) return [];
        try {
            const parsed = typeof eco.proposedChanges === 'string'
                ? JSON.parse(eco.proposedChanges)
                : eco.proposedChanges;
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    })();

    const tabs = [
        {
            id: 'details',
            label: 'Details',
            content: (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card title="Change Request">
                        <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">ECO Number</dt>
                                <dd className="mt-1 text-sm text-gray-900">ECO-{eco.id.substring(0, 8).toUpperCase()}</dd>
                            </div>
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">Proposed By</dt>
                                <dd className="mt-1 text-sm text-gray-900 flex items-center">
                                    <User className="w-3 h-3 mr-1 text-gray-400" />
                                    {eco.requestedBy?.name || 'Unknown'}
                                </dd>
                            </div>
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">Priority</dt>
                                <dd className="mt-1">
                                    <Badge variant={eco.priority === 'critical' ? 'error' : eco.priority === 'high' ? 'warning' : 'info'}>
                                        {eco.priority}
                                    </Badge>
                                </dd>
                            </div>
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">Status</dt>
                                <dd className="mt-1">
                                    <Badge variant={eco.status === 'approved' ? 'success' : eco.status === 'rejected' ? 'error' : 'warning'}>
                                        {eco.status}
                                    </Badge>
                                </dd>
                            </div>
                            <div className="sm:col-span-2">
                                <dt className="text-sm font-medium text-gray-500">Description</dt>
                                <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{eco.description}</dd>
                            </div>
                            <div className="sm:col-span-2">
                                <dt className="text-sm font-medium text-gray-500">Reason</dt>
                                <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{eco.reason}</dd>
                            </div>
                        </dl>
                    </Card>

                    <div className="space-y-6">
                        <Card title="Impact & Risk">
                            {eco.aiRiskScore !== null && eco.aiRiskScore !== undefined ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">AI Risk Score</p>
                                            <p className={`text-3xl font-bold ${
                                                eco.aiRiskScore > 70 ? 'text-red-600' : 
                                                eco.aiRiskScore > 40 ? 'text-yellow-600' : 'text-green-600'
                                            }`}>
                                                {eco.aiRiskScore}/100
                                            </p>
                                        </div>
                                        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                                            eco.aiRiskScore > 70 ? 'bg-red-100' : 
                                            eco.aiRiskScore > 40 ? 'bg-yellow-100' : 'bg-green-100'
                                        }`}>
                                            <AlertTriangle className={`w-8 h-8 ${
                                                eco.aiRiskScore > 70 ? 'text-red-600' : 
                                                eco.aiRiskScore > 40 ? 'text-yellow-600' : 'text-green-600'
                                            }`} />
                                        </div>
                                    </div>
                                    
                                    {eco.aiPredictedDelay !== null && (
                                        <div className="p-3 bg-blue-50 rounded-lg">
                                            <p className="text-sm font-medium text-blue-800">Predicted Delay</p>
                                            <p className="text-lg font-semibold text-blue-900">{eco.aiPredictedDelay} days</p>
                                        </div>
                                    )}
                                    
                                    {eco.aiKeyRisks && (() => {
                                        try {
                                            const risks = JSON.parse(eco.aiKeyRisks);
                                            return risks.length > 0 ? (
                                                <div className="p-3 bg-orange-50 rounded-lg">
                                                    <p className="text-sm font-medium text-orange-800 mb-2">Key Risk Factors</p>
                                                    <ul className="space-y-1">
                                                        {risks.map((risk: string, idx: number) => (
                                                            <li key={idx} className="text-sm text-orange-700 flex items-start">
                                                                <span className="mr-2">•</span>
                                                                {risk}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ) : null;
                                        } catch {
                                            return null;
                                        }
                                    })()}
                                    
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        icon={RefreshCw}
                                        onClick={handleAnalyzeRisk}
                                        isLoading={analyzingRisk}
                                        className="w-full"
                                    >
                                        Re-analyze Risk
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="bg-yellow-50 border border-yellow-100 rounded-md p-4">
                                        <div className="flex">
                                            <div className="flex-shrink-0">
                                                <AlertTriangle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                                            </div>
                                            <div className="ml-3">
                                                <h3 className="text-sm font-medium text-yellow-800">No AI Analysis</h3>
                                                <div className="mt-2 text-sm text-yellow-700">
                                                    <p>Risk analysis has not been performed for this ECO.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <Button
                                        icon={Sparkles}
                                        onClick={handleAnalyzeRisk}
                                        isLoading={analyzingRisk}
                                        className="w-full bg-gradient-to-r from-[#8D6E63] to-[#6D4C41]"
                                    >
                                        Analyze Risk
                                    </Button>
                                </div>
                            )}
                        </Card>

                        <Card title="Proposed Changes">
                            {proposedChanges.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Field</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Original</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proposed</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {proposedChanges.map((change: any, idx: number) => (
                                                <tr key={idx}>
                                                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{change.field}</td>
                                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-red-600 bg-red-50">{change.oldValue}</td>
                                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-green-600 bg-green-50">{change.newValue}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">No specific field changes recorded.</p>
                            )}
                        </Card>
                    </div>
                </div>
            )
        },
        {
            id: 'history',
            label: 'Discussion & History',
            content: (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        {/* Comments Section */}
                        <Card title="Discussion">
                            <div className="space-y-6">
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <textarea
                                            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#8D6E63] focus:border-transparent"
                                            placeholder="Add a comment or note..."
                                            rows={3}
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                        />
                                        <div className="mt-2 flex justify-end">
                                            <Button size="sm" onClick={handlePostComment} isLoading={commentLoading} icon={Send}>Post Comment</Button>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {eco.comments && eco.comments.length > 0 ? (
                                        eco.comments.map((comment: any) => (
                                            <div key={comment.id} className="flex gap-4">
                                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                                                    {comment.user.name.charAt(0)}
                                                </div>
                                                <div className="flex-1 bg-gray-50 p-4 rounded-lg rounded-tl-none">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="font-medium text-sm text-gray-900">{comment.user.name}</span>
                                                        <span className="text-xs text-gray-500">{new Date(comment.createdAt).toLocaleString()}</span>
                                                    </div>
                                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-center text-sm text-gray-500 py-4">No comments yet. Start a discussion!</p>
                                    )}
                                </div>
                            </div>
                        </Card>
                    </div>

                    <div className="lg:col-span-1">
                        {/* Audit Logs Section */}
                        <Card title="Audit Log">
                            <div className="relative pl-6 border-l-2 border-gray-200 space-y-8 py-2">
                                {eco.auditLogs && eco.auditLogs.map((log: any) => (
                                    <div key={log.id} className="relative">
                                        <span className="absolute -left-[31px] top-1 bg-gray-300 w-4 h-4 rounded-full border-2 border-white"></span>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-900">
                                                {log.user.name}
                                                <span className="font-normal text-gray-600"> {log.action.toLowerCase().replace('_', ' ')}d details</span>
                                            </span>
                                            {log.oldValue && log.newValue && (
                                                <span className="text-xs text-gray-500 mt-1">
                                                    Changed status from <span className="font-medium">{log.oldValue}</span> to <span className="font-medium">{log.newValue}</span>
                                                </span>
                                            )}
                                            <span className="text-xs text-gray-400 mt-1 flex items-center">
                                                <Clock className="w-3 h-3 mr-1" />
                                                {new Date(log.timestamp).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                ))}

                                {/* Initial Creation Log Fallback if audits empty */}
                                {(!eco.auditLogs || eco.auditLogs.length === 0) && (
                                    <div className="relative">
                                        <span className="absolute -left-[31px] top-1 bg-gray-300 w-4 h-4 rounded-full border-2 border-white"></span>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-900">System</span>
                                            <span className="text-xs text-gray-500">Log creation pending...</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>
                </div>
            )
        },
        {
            id: 'versions',
            label: 'Versions',
            content: (
                <Card title="Version History">
                    <div className="space-y-4">
                        <p className="text-sm text-gray-500 mb-4">
                            Each time an ECO is edited, a new version is created. Click on any version to view its details.
                        </p>
                        {versions.length > 0 ? (
                            versions.map((version: any) => (
                                <div
                                    key={version.id}
                                    className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                                        version.id === eco.id 
                                            ? 'border-[#8D6E63] bg-[#FAF8F6]' 
                                            : 'border-gray-200 hover:border-[#8D6E63]'
                                    }`}
                                    onClick={() => version.id !== eco.id && router.push(`/ecos/${version.id}`)}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h4 className="font-semibold text-gray-900">
                                                    Version {version.version}
                                                    {version.isLatest && (
                                                        <Badge variant="success" className="ml-2">Latest</Badge>
                                                    )}
                                                    {version.id === eco.id && (
                                                        <Badge variant="info" className="ml-2">Current</Badge>
                                                    )}
                                                </h4>
                                                <Badge variant={
                                                    version.status === 'approved' ? 'success' :
                                                        version.status === 'rejected' ? 'error' :
                                                            version.status === 'draft' ? 'warning' : 'default'
                                                }>
                                                    {version.status}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-gray-600 mb-2 font-medium">{version.title}</p>
                                            <p className="text-sm text-gray-500 mb-2 line-clamp-2">{version.description}</p>
                                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                                <span className="flex items-center">
                                                    <User className="w-3 h-3 mr-1" />
                                                    {version.requestedBy?.name || 'Unknown'}
                                                </span>
                                                <span className="flex items-center">
                                                    <Calendar className="w-3 h-3 mr-1" />
                                                    {new Date(version.createdAt).toLocaleDateString()}
                                                </span>
                                                <span>Priority: {version.priority}</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            {version.id !== eco.id && (
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        router.push(`/ecos/${version.id}`);
                                                    }}
                                                >
                                                    View Details
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <p>This is the first version of this ECO.</p>
                                <p className="text-xs mt-2">New versions will be created when you edit this ECO.</p>
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
                <Link href="/ecos" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to ECOs
                </Link>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-[#3E2723]">{eco.title}</h1>
                        <p className="text-gray-500">ECO-{eco.id.substring(0, 8).toUpperCase()}</p>
                    </div>

                    <div className="flex gap-3">
                        {(eco.status === 'draft' || eco.status === 'in-review') && (
                            <Button variant="secondary" icon={Edit} onClick={() => router.push(`/ecos/${eco.id}/edit`)}>
                                Edit Change
                            </Button>
                        )}

                        {eco.status === 'draft' && (
                            <Button
                                onClick={() => handleStatusChange('in-review')}
                                isLoading={actionLoading}
                                icon={Play}
                            >
                                Submit
                            </Button>
                        )}

                        {eco.status === 'in-review' && (
                            <>
                                <Button
                                    variant="danger"
                                    onClick={() => handleStatusChange('rejected')}
                                    isLoading={actionLoading}
                                    icon={XCircle}
                                >
                                    Reject
                                </Button>
                                <Button
                                    variant="primary"
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => handleStatusChange('approved')}
                                    isLoading={actionLoading}
                                    icon={CheckCircle}
                                >
                                    Approve
                                </Button>
                            </>
                        )}

                        {eco.status === 'approved' && (
                            <Button
                                onClick={() => handleStatusChange('implemented')}
                                isLoading={actionLoading}
                            >
                                Implement
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <Tabs tabs={tabs} />
        </AppLayout>
    );
}
