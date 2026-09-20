"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { register } from "@/services/auth.service";
import { useAuth } from "../providers/AuthProvider";
import Cookies from "js-cookie";
import Link from "next/link";
import toast from "react-hot-toast";

export default function RegisterForm() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await register({ name, email, password });
      Cookies.set("token", data.accessToken, { expires: 7 });
      localStorage.setItem("token", data.accessToken);
      setUser(data.user);
      toast.success("Account created successfully!");
      router.push("/");
    } catch (err: any) {
      toast.error(err.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-normal text-gray-900 dark:text-white">Create Account</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Join the Stalk community</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-normal text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#4E4AFC] focus:outline-none"
            placeholder="John Doe"
          />
        </div>

        <div>
          <label className="block text-sm font-normal text-gray-700 dark:text-gray-300 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#4E4AFC] focus:outline-none"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-normal text-gray-700 dark:text-gray-300 mb-1">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#4E4AFC] focus:outline-none"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 bg-[#4E4AFC] hover:bg-[#3F3BE6] text-white font-normal rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
        >
          {loading ? "Creating..." : "Sign Up"}
        </button>
      </form>

      <p className="text-center text-xs text-gray-500 dark:text-gray-400">
        Already have an account?{" "}
        <Link href="/auth/login" className="text-[#4E4AFC] hover:underline font-normal">
          Sign in
        </Link>
      </p>
    </div>
  );
}

