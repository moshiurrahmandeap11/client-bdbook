"use client";

import { useState } from "react";
import toast from "react-hot-toast";

interface GoogleSignInButtonProps {
  text?: string;
  disabled?: boolean;
}

export default function GoogleSignInButton({
  text = "Continue with Google",
  disabled = false,
}: GoogleSignInButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = () => {
    const clientId =
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
      "277143469886-iaqandra9ce62d85ojoppvttro16sflf.apps.googleusercontent.com";

    if (!clientId) {
      toast.error("Google Client ID is not configured");
      return;
    }

    try {
      setLoading(true);
      const redirectUri = `${window.location.origin}/auth/callback/google`;
      const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&response_type=code&scope=openid%20email%20profile&prompt=select_account`;

      window.location.href = googleAuthUrl;
    } catch (err: any) {
      setLoading(false);
      toast.error(err.message || "Failed to initialize Google Sign-In");
    }
  };

  return (
    <button
      type="button"
      onClick={handleGoogleSignIn}
      disabled={disabled || loading}
      className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 text-sm font-normal border border-slate-300 rounded-md transition-colors cursor-pointer disabled:opacity-50"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        />
      </svg>
      <span>{loading ? "Redirecting to Google..." : text}</span>
    </button>
  );
}

