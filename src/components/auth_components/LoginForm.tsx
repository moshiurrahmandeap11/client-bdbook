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
// [wip step 2/7]
