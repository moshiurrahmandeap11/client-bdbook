"use client";

import { useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { googleAuth } from "@/services/auth.service";
import { useAuth } from "@/components/providers/AuthProvider";
import Cookies from "js-cookie";
import toast from "react-hot-toast";

function GoogleCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuth();
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;

    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      processedRef.current = true;
      toast.error("Google sign-in was cancelled or denied");
      router.replace("/auth/login");
      return;
    }

    if (!code) {
      processedRef.current = true;
      toast.error("No authorization code found");
      router.replace("/auth/login");
      return;
    }

    processedRef.current = true;

    const exchangeCode = async () => {
      try {
        const redirectUri = `${window.location.origin}/auth/callback/google`;
        const data = await googleAuth({ code, redirectUri });

        Cookies.set("token", data.accessToken, { expires: 7 });
// [wip step 4/8]
