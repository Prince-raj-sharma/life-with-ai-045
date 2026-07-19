import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./compiled.css";
import QueryProvider from "@/providers/QueryProvider";
import AuthProvider from "@/providers/AuthProvider";
import ToastProvider from "@/providers/ToastProvider";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "LIFE WITH AI | Premium EdTech Platform",
  description: "Transform Your Future with AI. Master programming, artificial intelligence, and cutting-edge technology with university-grade online learning.",
  keywords: ["AI", "EdTech", "Coding", "Programming", "Learn Online", "LIFE WITH AI", "Courses"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} font-sans antialiased bg-white text-slate-900`}>
      <body className="min-h-screen flex flex-col bg-white">
        <QueryProvider>
          <AuthProvider>
            <ToastProvider>
              <Navbar />
              <main className="flex-grow">{children}</main>
              <Footer />
            </ToastProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
