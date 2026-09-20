import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/components/providers/QueryProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { SocketProvider } from "@/components/providers/SocketProvider";
import Header from "@/components/shared/Header";
import Sidebar from "@/components/shared/Sidebar";
import RightSidebar from "@/components/shared/RightSidebar";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Stalk - Modern Social Network",
  description: "Connect, Share and Discover on Stalk",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${inter.className} bg-white text-slate-900 min-h-screen flex flex-col`}
      >
        <QueryProvider>
          <AuthProvider>
            <SocketProvider>
// [wip step 2/3]
