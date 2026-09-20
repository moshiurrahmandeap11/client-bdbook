import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/components/providers/QueryProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { SocketProvider } from "@/components/providers/SocketProvider";
import { NotificationProvider } from "@/components/providers/NotificationProvider";
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
              <NotificationProvider>
                <Toaster position="bottom-left" />
                <Header />
                <div className="flex-1 flex w-full pt-14 sm:pt-16">
                  <Sidebar />
                  <main className="flex-1 min-w-0 bg-white">
                    {children}
                  </main>
                  <RightSidebar />
                </div>
              </NotificationProvider>
            </SocketProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
