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
// [wip step 1/7]
