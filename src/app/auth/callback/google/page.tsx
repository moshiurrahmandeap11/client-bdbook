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
        localStorage.setItem("token", data.accessToken);
        setUser(data.user);

        toast.success("Signed in with Google!");
        router.replace("/");
      } catch (err: any) {
        toast.error(err.message || "Failed to complete Google sign-in");
        router.replace("/auth/login");
      }
    };

    exchangeCode();
  }, [searchParams, router, setUser]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="w-full max-w-sm p-6 text-center bg-white border border-slate-200/90 rounded-md">
        <div className="w-8 h-8 mx-auto mb-4 border-2 border-[#4E4AFC] border-t-transparent rounded-full animate-spin" />
        <h2 className="text-base font-normal text-slate-800">Signing you in with Google...</h2>
        <p className="mt-1 text-xs font-normal text-slate-500">Please wait while we authenticate your account</p>
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <div className="w-full max-w-sm p-6 text-center bg-white border border-slate-200/90 rounded-md">
            <div className="w-8 h-8 mx-auto mb-4 border-2 border-[#4E4AFC] border-t-transparent rounded-full animate-spin" />
            <h2 className="text-base font-normal text-slate-800">Loading...</h2>
          </div>
        </div>
      }
    >
      <GoogleCallbackContent />
    </Suspense>
  );
}

