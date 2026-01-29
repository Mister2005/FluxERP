import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    icon?: React.ElementType;
}

export function Button({
    children,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    icon: Icon,
    className = '',
    disabled,
    ...props
}: ButtonProps) {

    const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none rounded-lg';

    const variants = {
        primary: 'bg-[#8D6E63] text-white hover:bg-[#6D4C41] focus:ring-[#8D6E63]',
        secondary: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-600',
        ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900',
    };

    const sizes = {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 py-2 text-sm',
        lg: 'h-12 px-6 text-base',
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            disabled={isLoading || disabled}
            {...props}
        >
            {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : Icon ? (
                <Icon className="mr-2 h-4 w-4" />
            ) : null}
            {children}
        </button>
    );
}
