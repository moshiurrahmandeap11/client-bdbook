import { Geist, Geist_Mono } from "next/font/google";
import Header from "./components/sharedComponents/Header/Header";
import "./globals.css";
import { AuthProvider } from "./hooks/AuthProvider";
import { SocketProvider } from "./hooks/SocketContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "BD Book",
  description:
    "BD Book is a modern social media platform where users can share posts, connect with others, discover trending content, and engage in a growing online community.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <SocketProvider>
            <Header />
            {children}
          </SocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
