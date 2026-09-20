"use client";

import { useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { googleAuth } from "@/services/auth.service";
import { useAuth } from "@/components/providers/AuthProvider";
import Cookies from "js-cookie";
import toast from "react-hot-toast";

function GoogleCallbackContent() {
// [wip step 1/8]
