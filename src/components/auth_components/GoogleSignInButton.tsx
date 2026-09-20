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
// [wip step 3/7]
