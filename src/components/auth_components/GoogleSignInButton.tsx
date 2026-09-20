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
// [wip step 2/7]
