'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import DataManagementPanel from '@/components/data/CSVManagement';
import EmailSettings from '@/components/settings/EmailSettings';
import JobMonitoringPanel from '@/components/settings/JobMonitoringPanel';
import { Plus, Edit, Trash2, Shield, Users, Settings as SettingsIcon, Database, Mail, Activity, X } from 'lucide-react';
import { usePermissions } from '@/lib/permissions';
import AccessDenied from '@/components/ui/AccessDenied';

interface User {
    id: string;
    email: string;
    name: string;
    roleId: string;
    role: { name: string };
    isActive: boolean;
    createdAt: string;
}

interface Role {
    id: string;
    name: string;
    description: string;
    permissions: string;
    isSystem: boolean;
    userCount: number;
}

// Modal component
function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

export default function SettingsPage() {
    const { can, loading: permLoading } = usePermissions();
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    
    // Modal state
    const [userModalOpen, setUserModalOpen] = useState(false);
    const [roleModalOpen, setRoleModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [saving, setSaving] = useState(false);
    
    // Form state
    const [userForm, setUserForm] = useState({ name: '', email: '', password: '', roleId: '', isActive: true });
    const [roleForm, setRoleForm] = useState({ name: '', description: '', permissions: [] as string[] });

    const availablePermissions = [
        'products.read', 'products.write', 'products.delete', 'products.export',
        'boms.read', 'boms.write', 'boms.delete', 'boms.canvas',
        'ecos.read', 'ecos.write', 'ecos.delete', 'ecos.approve',
        'workorders.read', 'workorders.write', 'workorders.delete',
        'reports.read', 'reports.export',
        'settings.read', 'settings.write', 'settings.iam',
        'users.read', 'users.write', 'users.delete', 'users.roles',
        'roles.read', 'roles.write', 'roles.delete',
        'suppliers.read', 'suppliers.write', 'suppliers.delete'
    ];

    const fetchData = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }

        try {
            const [usersRes, rolesRes] = await Promise.all([
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/users`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/roles`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);
            
            const usersData = await usersRes.json();
            const rolesData = await rolesRes.json();
            
            const usersItems = Array.isArray(usersData) ? usersData : (usersData?.data || []);
            const rolesItems = Array.isArray(rolesData) ? rolesData : (rolesData?.data || []);
            
            setUsers(Array.isArray(usersItems) ? usersItems : []);
            setRoles(Array.isArray(rolesItems) ? rolesItems : []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [router]);

    // User CRUD handlers
    const openAddUser = () => {
        setEditingUser(null);
        setUserForm({ name: '', email: '', password: '', roleId: roles[0]?.id || '', isActive: true });
        setUserModalOpen(true);
    };

    const openEditUser = (user: User) => {
        setEditingUser(user);
        setUserForm({ name: user.name, email: user.email, password: '', roleId: user.roleId, isActive: user.isActive });
        setUserModalOpen(true);
    };

    const handleSaveUser = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        setSaving(true);
        try {
            const url = editingUser 
                ? `${process.env.NEXT_PUBLIC_API_URL}/users/${editingUser.id}`
                : `${process.env.NEXT_PUBLIC_API_URL}/users`;
            
            const body = editingUser 
                ? { name: userForm.name, email: userForm.email, roleId: userForm.roleId, isActive: userForm.isActive, ...(userForm.password && { password: userForm.password }) }
                : userForm;
            
            const res = await fetch(url, {
                method: editingUser ? 'PUT' : 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            
            if (res.ok) {
                setUserModalOpen(false);
                fetchData();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to save user');
            }
        } catch (err) {
            console.error(err);
            alert('Failed to save user');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteUser = async (user: User) => {
        if (!confirm(`Are you sure you want to delete user "${user.name}"?`)) return;
        
        const token = localStorage.getItem('token');
        if (!token) return;
        
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/${user.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (res.ok) {
                fetchData();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to delete user');
            }
        } catch (err) {
            console.error(err);
            alert('Failed to delete user');
        }
    };

    // Role CRUD handlers
    const openAddRole = () => {
        setEditingRole(null);
        setRoleForm({ name: '', description: '', permissions: [] });
        setRoleModalOpen(true);
    };

    const openEditRole = (role: Role) => {
        setEditingRole(role);
        let permissions: string[] = [];
        try {
            permissions = typeof role.permissions === 'string' ? JSON.parse(role.permissions) : role.permissions;
        } catch { permissions = []; }
        setRoleForm({ name: role.name, description: role.description, permissions });
        setRoleModalOpen(true);
    };

    const handleSaveRole = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        setSaving(true);
        try {
            const url = editingRole 
                ? `${process.env.NEXT_PUBLIC_API_URL}/roles/${editingRole.id}`
                : `${process.env.NEXT_PUBLIC_API_URL}/roles`;
            
            const res = await fetch(url, {
                method: editingRole ? 'PUT' : 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(roleForm)
            });
            
            if (res.ok) {
                setRoleModalOpen(false);
                fetchData();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to save role');
            }
        } catch (err) {
            console.error(err);
            alert('Failed to save role');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteRole = async (role: Role) => {
        if (role.isSystem) {
            alert('Cannot delete system roles');
            return;
        }
        if (!confirm(`Are you sure you want to delete role "${role.name}"?`)) return;
        
        const token = localStorage.getItem('token');
        if (!token) return;
        
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/roles/${role.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (res.ok) {
                fetchData();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to delete role');
            }
        } catch (err) {
            console.error(err);
            alert('Failed to delete role');
        }
    };

    const togglePermission = (perm: string) => {
        setRoleForm(prev => ({
            ...prev,
            permissions: prev.permissions.includes(perm) 
                ? prev.permissions.filter(p => p !== perm)
                : [...prev.permissions, perm]
        }));
    };

    const tabs = [
        {
            id: 'users',
            label: 'Users',
            icon: Users,
            content: (
                <div>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
                        <Button icon={Plus} size="sm" onClick={openAddUser}>Add User</Button>
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
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {users.map((user) => (
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
                                                {new Date(user.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <div className="flex gap-2">
                                                    <button 
                                                        className="text-[#8D6E63] hover:text-[#6D4C41]"
                                                        onClick={() => openEditUser(user)}
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        className="text-red-600 hover:text-red-900"
                                                        onClick={() => handleDeleteUser(user)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {users.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">No users found</td>
                                        </tr>
                                    )}
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
                        <Button icon={Plus} size="sm" onClick={openAddRole}>Add Role</Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Array.isArray(roles) && roles.map((role) => (
                            <Card key={role.id}>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 capitalize">{role.name}</h3>
                                        <p className="text-sm text-gray-500">{role.description || 'No description'}</p>
                                        {role.isSystem && <Badge variant="warning" className="mt-1">System</Badge>}
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
                                                    permissions.slice(0, 5).map((perm: string, idx: number) => (
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
                                        {(() => {
                                            try {
                                                const permissions = typeof role.permissions === 'string' ? JSON.parse(role.permissions) : role.permissions;
                                                return permissions && permissions.length > 5 ? (
                                                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                                                        +{permissions.length - 5} more
                                                    </span>
                                                ) : null;
                                            } catch { return null; }
                                        })()}
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-4 border-t border-gray-100">
                                    <Button 
                                        variant="secondary" 
                                        size="sm" 
                                        icon={Edit}
                                        onClick={() => openEditRole(role)}
                                    >
                                        {role.isSystem ? 'Edit Permissions' : 'Edit'}
                                    </Button>
                                    <Button 
                                        variant="danger" 
                                        size="sm" 
                                        icon={Trash2}
                                        onClick={() => handleDeleteRole(role)}
                                        disabled={role.isSystem}
                                    >
                                        Delete
                                    </Button>
                                </div>
                            </Card>
                        ))}
                        {roles.length === 0 && (
                            <div className="col-span-3 text-center text-gray-500 py-8">No roles found</div>
                        )}
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
        },
        {
            id: 'email',
            label: 'Email',
            icon: Mail,
            content: <EmailSettings />
        },
        {
            id: 'jobs',
            label: 'Background Jobs',
            icon: Activity,
            content: <JobMonitoringPanel />
        },
        {
            id: 'data',
            label: 'Data Management',
            icon: Database,
            content: (
                <div className="space-y-8">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Products</h2>
                        <DataManagementPanel type="products" onImportSuccess={() => window.location.reload()} />
                    </div>
                    
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Bills of Materials</h2>
                        <DataManagementPanel type="boms" onImportSuccess={() => window.location.reload()} />
                    </div>
                    
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Engineering Change Orders</h2>
                        <DataManagementPanel type="ecos" />
                    </div>
                    
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Work Orders</h2>
                        <DataManagementPanel type="work-orders" />
                    </div>
                </div>
            )
        }
    ];

    // Permission check (after all hooks)
    if (!permLoading && !can('settings.read')) {
        return <AccessDenied feature="Settings" />;
    }

    return (
        <AppLayout>
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-[#3E2723]">Settings</h1>
                <p className="text-gray-500">Manage users, roles, and application settings</p>
            </div>

            <Tabs tabs={tabs} />
            
            {/* User Modal */}
            <Modal isOpen={userModalOpen} onClose={() => setUserModalOpen(false)} title={editingUser ? 'Edit User' : 'Add User'}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input
                            type="text"
                            value={userForm.name}
                            onChange={(e) => setUserForm(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#8D6E63]"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                            type="email"
                            value={userForm.email}
                            onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#8D6E63]"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {editingUser ? 'New Password (leave blank to keep current)' : 'Password'}
                        </label>
                        <input
                            type="password"
                            value={userForm.password}
                            onChange={(e) => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#8D6E63]"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                        <select
                            value={userForm.roleId}
                            onChange={(e) => setUserForm(prev => ({ ...prev, roleId: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#8D6E63]"
                        >
                            <option value="">Select a role</option>
                            {roles.map(role => (
                                <option key={role.id} value={role.id}>{role.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="userActive"
                            checked={userForm.isActive}
                            onChange={(e) => setUserForm(prev => ({ ...prev, isActive: e.target.checked }))}
                            className="w-4 h-4 text-[#8D6E63] rounded"
                        />
                        <label htmlFor="userActive" className="text-sm text-gray-700">Active</label>
                    </div>
                    <div className="flex gap-2 pt-4">
                        <Button onClick={handleSaveUser} isLoading={saving}>
                            {editingUser ? 'Update User' : 'Create User'}
                        </Button>
                        <Button variant="secondary" onClick={() => setUserModalOpen(false)}>Cancel</Button>
                    </div>
                </div>
            </Modal>
            
            {/* Role Modal */}
            <Modal isOpen={roleModalOpen} onClose={() => setRoleModalOpen(false)} title={editingRole ? (editingRole.isSystem ? 'Edit System Role Permissions' : 'Edit Role') : 'Add Role'}>
                <div className="space-y-4">
                    {editingRole?.isSystem && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                            System roles cannot be renamed or deleted, but you can modify their permissions.
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input
                            type="text"
                            value={roleForm.name}
                            onChange={(e) => setRoleForm(prev => ({ ...prev, name: e.target.value }))}
                            disabled={editingRole?.isSystem}
                            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#8D6E63] ${editingRole?.isSystem ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                            value={roleForm.description}
                            onChange={(e) => setRoleForm(prev => ({ ...prev, description: e.target.value }))}
                            disabled={editingRole?.isSystem}
                            rows={2}
                            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#8D6E63] ${editingRole?.isSystem ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                        <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
                            <div className="grid grid-cols-2 gap-2">
                                {availablePermissions.map(perm => (
                                    <label key={perm} className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={roleForm.permissions.includes(perm)}
                                            onChange={() => togglePermission(perm)}
                                            className="w-3 h-3 text-[#8D6E63] rounded"
                                        />
                                        <span className="text-gray-700">{perm}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2 pt-4">
                        <Button onClick={handleSaveRole} isLoading={saving}>
                            {editingRole ? 'Update Role' : 'Create Role'}
                        </Button>
                        <Button variant="secondary" onClick={() => setRoleModalOpen(false)}>Cancel</Button>
                    </div>
                </div>
            </Modal>
        </AppLayout>
    );
}
