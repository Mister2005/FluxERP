import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    contentClassName?: string;
    title?: string;
    action?: React.ReactNode;
}

export function Card({ children, className = '', contentClassName, title, action }: CardProps) {
    return (
        <div className={`bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden ${className}`}>
            {(title || action) && (
                <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                    {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
                    {action && <div>{action}</div>}
                </div>
            )}
            <div className={contentClassName || 'p-6'}>
                {children}
            </div>
        </div>
    );
}
