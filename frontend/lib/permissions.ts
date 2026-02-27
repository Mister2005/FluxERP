'use client';

import { useState, useEffect } from 'react';

export interface UserInfo {
    id: string;
    email: string;
    name: string;
    role: string;
    permissions: string[];
}

/**
 * Get the current user from localStorage
 */
export function getUser(): UserInfo | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem('user');
        if (!raw) return null;
        return JSON.parse(raw) as UserInfo;
    } catch {
        return null;
    }
}

/**
 * Check if user has a specific permission.
 * Supports wildcard matching: 'products.*' matches 'products.read'
 */
export function hasPermission(permissions: string[], required: string): boolean {
    return permissions.some(p => {
        if (p === required) return true;
        if (p.endsWith('.*')) {
            const prefix = p.slice(0, -1); // 'products.'
            return required.startsWith(prefix);
        }
        return false;
    });
}

/**
 * Check if user has ANY of the given permissions
 */
export function hasAnyPermission(permissions: string[], required: string[]): boolean {
    return required.some(r => hasPermission(permissions, r));
}

/**
 * React hook that returns the current user and permission checker functions.
 * Re-reads from localStorage on mount.
 */
export function usePermissions() {
    const [user, setUser] = useState<UserInfo | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setUser(getUser());
        setLoading(false);
    }, []);

    const can = (permission: string): boolean => {
        // If no permissions data (old session), grant access so UI isn't broken
        // Backend still enforces permissions on API calls
        if (!user?.permissions || !Array.isArray(user.permissions)) return true;
        return hasPermission(user.permissions, permission);
    };

    const canAny = (permissions: string[]): boolean => {
        if (!user?.permissions || !Array.isArray(user.permissions)) return true;
        return hasAnyPermission(user.permissions, permissions);
    };

    const isAdmin = user?.role === 'Administrator';

    return { user, loading, can, canAny, isAdmin };
}

/**
 * Permission-to-page mapping for sidebar filtering.
 * Each page requires at least one of the listed permissions to be visible.
 */
export const pagePermissions: Record<string, string[]> = {
    '/dashboard': [], // everyone sees dashboard
    '/products': ['products.read'],
    '/boms': ['boms.read'],
    '/ecos': ['ecos.read'],
    '/work-orders': ['workorders.read'],
    '/suppliers': ['suppliers.read'],
    '/ai': [], // everyone can use AI assistant
    '/reports': ['reports.read'],
    '/settings': ['settings.read'],
};
