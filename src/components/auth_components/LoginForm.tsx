"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/services/auth.service";
import { useAuth } from "../providers/AuthProvider";
import Cookies from "js-cookie";
import Link from "next/link";
import toast from "react-hot-toast";
import GoogleSignInButton from "./GoogleSignInButton";

export default function LoginForm() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await login({ email, password });
      Cookies.set("token", data.accessToken, { expires: 7 });
      localStorage.setItem("token", data.accessToken);
      setUser(data.user);
      toast.success("Logged in successfully!");
      router.push("/");
    } catch (err: any) {
      toast.error(err.message || "Failed to login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white border border-slate-200/90 rounded-md p-6 sm:p-8 animate-auth-card">
      <div className="text-center space-y-1.5 mb-6">
        <h1 className="text-2xl font-normal text-slate-900">Welcome Back</h1>
        <p className="text-sm font-normal text-slate-500">Sign in to your Stalk account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-normal text-slate-700 mb-1.5">
            Email address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm font-normal border border-slate-300 rounded-md bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#4E4AFC] focus:ring-0 focus:outline-none transition-colors"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-normal text-slate-700">
              Password
            </label>
          </div>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm font-normal border border-slate-300 rounded-md bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#4E4AFC] focus:ring-0 focus:outline-none transition-colors"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 bg-[#4E4AFC] hover:bg-[#3F3BE6] text-white font-normal rounded-md transition-colors disabled:opacity-50 cursor-pointer text-sm mt-2"
        >
          {loading ? "Signing in..." : "Log In"}
        </button>
      </form>

      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-slate-400 font-normal">or</span>
        </div>
      </div>

// [wip step 6/7]
