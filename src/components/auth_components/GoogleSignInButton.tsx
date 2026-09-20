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
// [wip step 5/7]
