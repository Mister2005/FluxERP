import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { Suspense } from "react";
import AuthProvider from "@/components/providers/AuthProvider";
import PageTransitionBar from "@/components/ui/PageTransitionBar";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "FluxERP - AI-First PLM System",
    description: "Intelligent Product Lifecycle Management with AI",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <head>
                {/* Preconnect to the API backend to reduce latency */}
                <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'} />
                <link rel="preconnect" href={process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'} crossOrigin="anonymous" />
            </head>
            <body className={inter.className}>
                <AuthProvider>
                    <Suspense fallback={null}>
                        <PageTransitionBar />
                    </Suspense>
                    {children}
                </AuthProvider>
                <SpeedInsights />
                <Analytics />
            </body>
        </html>
    );
}
