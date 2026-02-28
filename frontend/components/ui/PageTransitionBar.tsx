'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Lightweight page transition indicator — a thin progress bar at the top
 * Shows during client-side navigation to eliminate the "white screen" feel
 */
export default function PageTransitionBar() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        // Reset immediately when route changes (navigation completed)
        setLoading(false);
        setProgress(100);
        const t = setTimeout(() => setProgress(0), 200);
        return () => clearTimeout(t);
    }, [pathname, searchParams]);

    useEffect(() => {
        // Intercept all link clicks to show transition bar
        const handleClick = (e: MouseEvent) => {
            const anchor = (e.target as HTMLElement).closest('a');
            if (!anchor) return;
            const href = anchor.getAttribute('href');
            if (!href || href.startsWith('http') || href.startsWith('#') || href === pathname) return;

            setLoading(true);
            setProgress(30);

            // Gradually increase
            const i1 = setTimeout(() => setProgress(60), 150);
            const i2 = setTimeout(() => setProgress(80), 400);

            return () => {
                clearTimeout(i1);
                clearTimeout(i2);
            };
        };

        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [pathname]);

    if (progress === 0) return null;

    return (
        <div
            className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none"
            style={{ opacity: loading ? 1 : 0, transition: 'opacity 200ms ease' }}
        >
            <div
                className="h-full bg-gradient-to-r from-[#8D6E63] via-[#A1887F] to-[#6D4C41]"
                style={{
                    width: `${progress}%`,
                    transition: loading ? 'width 400ms ease' : 'width 100ms ease',
                    boxShadow: '0 0 10px rgba(141, 110, 99, 0.5)',
                }}
            />
        </div>
    );
}
