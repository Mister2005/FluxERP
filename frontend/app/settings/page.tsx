'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { Plus, Edit, Trash2, Shield, Users, Settings as SettingsIcon } from 'lucide-react';

export default function SettingsPage() {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }

        Promise.all([
            fetch(`${process.env.NEXT_PUBLIC_API_URL}/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(res => res.json()),
            fetch(`${process.env.NEXT_PUBLIC_API_URL}/roles`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(res => res.json())
        ])
            .then(([usersData, rolesData]) => {
                setUsers(usersData);
                setRoles(rolesData);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [router]);

    const tabs = [
        {
            id: 'users',
            label: 'Users',
            icon: Users,
            content: (
                <div>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
                        <Button icon={Plus} size="sm">Add User</Button>
                    </div>

                    <Card>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Login</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {users.map((user: any) => (
                                        <tr key={user.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">{user.role?.name || 'No Role'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Badge variant={user.isActive ? 'success' : 'error'}>
                                                    {user.isActive ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <div className="flex gap-2">
                                                    <button className="text-[#8D6E63] hover:text-[#6D4C41]">
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button className="text-red-600 hover:text-red-900">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )
        },
        {
            id: 'roles',
            label: 'Roles & Permissions',
            icon: Shield,
            content: (
                <div>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-semibold text-gray-900">Role Management</h2>
                        <Button icon={Plus} size="sm">Add Role</Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Array.isArray(roles) && roles.map((role: any) => (
                            <Card key={role.id}>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 capitalize">{role.name}</h3>
                                        <p className="text-sm text-gray-500">{role.description || 'No description'}</p>
                                    </div>
                                    <Badge variant="default">{role.userCount || 0} users</Badge>
                                </div>

                                <div className="space-y-2 mb-4">
                                    <p className="text-sm font-medium text-gray-700">Permissions:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {(() => {
                                            try {
                                                const permissions = typeof role.permissions === 'string'
                                                    ? JSON.parse(role.permissions)
                                                    : role.permissions;

                                                return permissions && Array.isArray(permissions) && permissions.length > 0 ? (
                                                    permissions.map((perm: string, idx: number) => (
                                                        <span key={idx} className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                                                            {perm}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-gray-500">No permissions assigned</span>
                                                );
                                            } catch (e) {
                                                return <span className="text-xs text-gray-500">No permissions assigned</span>;
                                            }
                                        })()}
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-4 border-t border-gray-100">
                                    <Button variant="secondary" size="sm" icon={Edit}>Edit</Button>
                                    <Button variant="danger" size="sm" icon={Trash2}>Delete</Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )
        },
        {
            id: 'general',
            label: 'General Settings',
            icon: SettingsIcon,
            content: (
                <div className="space-y-6">
                    <Card title="Application Settings">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                                <input
                                    type="text"
                                    defaultValue="FluxERP"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#8D6E63]"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Default Currency</label>
                                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#8D6E63]">
                                    <option value="USD">USD - US Dollar</option>
                                    <option value="EUR">EUR - Euro</option>
                                    <option value="GBP">GBP - British Pound</option>
                                    <option value="INR">INR - Indian Rupee</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#8D6E63]">
                                    <option value="UTC">UTC</option>
                                    <option value="America/New_York">Eastern Time (US & Canada)</option>
                                    <option value="Europe/London">London</option>
                                    <option value="Asia/Kolkata">India Standard Time</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-3">
                                <input type="checkbox" id="notifications" className="w-4 h-4 text-[#8D6E63] rounded" />
                                <label htmlFor="notifications" className="text-sm text-gray-700">Enable email notifications</label>
                            </div>

                            <div className="flex items-center gap-3">
                                <input type="checkbox" id="ai-features" className="w-4 h-4 text-[#8D6E63] rounded" defaultChecked />
                                <label htmlFor="ai-features" className="text-sm text-gray-700">Enable AI features</label>
                            </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-gray-100">
                            <Button>Save Settings</Button>
                        </div>
                    </Card>

                    <Card title="API Configuration">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Gemini API Key</label>
                                <input
                                    type="password"
                                    placeholder="Enter your Gemini API key"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#8D6E63]"
                                />
                                <p className="text-xs text-gray-500 mt-1">Required for AI-powered features</p>
                            </div>

                            <div className="flex items-center gap-3">
                                <input type="checkbox" id="api-logging" className="w-4 h-4 text-[#8D6E63] rounded" />
                                <label htmlFor="api-logging" className="text-sm text-gray-700">Enable API request logging</label>
                            </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-gray-100">
                            <Button>Update API Settings</Button>
                        </div>
                    </Card>
                </div>
            )
        }
    ];

    return (
        <AppLayout>
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-[#3E2723]">Settings</h1>
                <p className="text-gray-500">Manage users, roles, and application settings</p>
            </div>

            <Tabs tabs={tabs} />
        </AppLayout>
    );
}
