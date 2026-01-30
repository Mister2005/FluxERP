/**
 * Centralized API utility for handling backend requests
 * Handles the new API response format: { success: boolean, data: T, message?: string }
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    error?: string;
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
    body?: unknown;
}

class ApiError extends Error {
    status: number;
    data?: unknown;

    constructor(message: string, status: number, data?: unknown) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
}

/**
 * Get auth token from localStorage
 */
function getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
}

/**
 * Make an API request and extract data from the response
 */
async function request<T>(
    endpoint: string,
    options: RequestOptions = {}
): Promise<T> {
    const token = getAuthToken();
    const { body, headers: customHeaders, ...restOptions } = options;

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...customHeaders,
    };

    if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
        ...restOptions,
        headers,
    };

    if (body !== undefined) {
        config.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_URL}${endpoint}`, config);
    
    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
        if (!response.ok) {
            throw new ApiError('Network error', response.status);
        }
        return {} as T;
    }

    const json = await response.json();

    if (!response.ok) {
        throw new ApiError(
            json.error || json.message || 'Request failed',
            response.status,
            json
        );
    }

    // Handle new API format: { success: boolean, data: T }
    // Also support legacy format where data is returned directly
    if (json.success !== undefined && json.data !== undefined) {
        return json.data as T;
    }

    // Legacy format - return as is
    return json as T;
}

/**
 * GET request
 */
export function get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: 'GET' });
}

/**
 * POST request
 */
export function post<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: 'POST', body: data });
}

/**
 * PUT request
 */
export function put<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: 'PUT', body: data });
}

/**
 * PATCH request
 */
export function patch<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: 'PATCH', body: data });
}

/**
 * DELETE request
 */
export function del<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: 'DELETE' });
}

/**
 * Login helper - stores token and user in localStorage
 */
export async function login(email: string, password: string): Promise<{ user: unknown; token: string }> {
    const result = await post<{ user: unknown; token: string }>('/auth/login', { email, password });
    
    if (result.token) {
        localStorage.setItem('token', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));
    }
    
    return result;
}

/**
 * Logout helper - clears localStorage
 */
export function logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
}

/**
 * Get current user from localStorage
 */
export function getCurrentUser(): unknown | null {
    if (typeof window === 'undefined') return null;
    const userData = localStorage.getItem('user');
    if (!userData || userData === 'undefined') return null;
    try {
        return JSON.parse(userData);
    } catch {
        return null;
    }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
    return !!getAuthToken() && !!getCurrentUser();
}

export { ApiError, API_URL };
export default { get, post, put, patch, del, login, logout, getCurrentUser, isAuthenticated };
