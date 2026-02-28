'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface User {
    id: string;
    name: string;
    email: string;
    role: { name: string; permissions: string };
    [key: string]: unknown;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (token: string, user: User) => void;
    logout: () => void;
    refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
    login: () => {},
    logout: () => {},
    refreshUser: () => {},
});

export function useAuth() {
    return useContext(AuthContext);
}

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/', '/login', '/signup'];

export default function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    const refreshUser = useCallback(() => {
        try {
            const storedToken = localStorage.getItem('token');
            const storedUser = localStorage.getItem('user');

            if (storedToken && storedUser && storedUser !== 'undefined') {
                const parsed = JSON.parse(storedUser);
                setToken(storedToken);
                setUser(parsed);
            } else {
                setToken(null);
                setUser(null);
            }
        } catch {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setToken(null);
            setUser(null);
        }
        setIsLoading(false);
    }, []);

    // Initialize auth state from localStorage
    useEffect(() => {
        refreshUser();
    }, [refreshUser]);

    // Redirect logic
    useEffect(() => {
        if (isLoading) return;

        const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

        if (!token && !isPublicRoute) {
            router.push('/login');
        }
    }, [isLoading, token, pathname, router]);

    const login = useCallback((newToken: string, newUser: User) => {
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(newUser));
        setToken(newToken);
        setUser(newUser);
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
        router.push('/login');
    }, [router]);

    return (
        <AuthContext.Provider value={{
            user,
            token,
            isLoading,
            isAuthenticated: !!token && !!user,
            login,
            logout,
            refreshUser,
        }}>
            {children}
        </AuthContext.Provider>
    );
}
