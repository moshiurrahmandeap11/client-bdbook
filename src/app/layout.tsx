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
// [wip step 1/3]
