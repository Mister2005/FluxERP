import React from 'react';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'default';

interface BadgeProps {
    children: React.ReactNode;
    variant?: BadgeVariant;
    className?: string;
}

export function Badge({ children, variant = 'neutral', className = '' }: BadgeProps) {
    const baseStyles = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';

    const variants = {
        success: 'bg-[#F1F8E9] text-[#2E7D32]', // Soft Green
        warning: 'bg-[#FFF8E1] text-[#EF6C00]', // Warm Orange
        error: 'bg-[#FFEBEE] text-[#C62828]',   // Soft Red
        info: 'bg-[#EFEBE9] text-[#8D6E63]',    // Primary Brown
        neutral: 'bg-gray-100 text-gray-800',
        default: 'bg-gray-100 text-gray-800',   // Alias for neutral
    };

    return (
        <span className={`${baseStyles} ${variants[variant]} ${className}`}>
            {children}
        </span>
    );
}
