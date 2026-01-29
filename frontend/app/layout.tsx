import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Use Inter as close match to system font
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
            <body className={inter.className}>{children}</body>
        </html>
    );
}
