import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_ROUTES = ["/message", "/profile"];
const AUTH_ROUTES = ["/auth/login", "/auth/register"];

async function fetchAuthStatus(request: NextRequest) {
  const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6969";
  const apiBaseUrl = rawApiUrl.endsWith("/v1/api")
    ? rawApiUrl
    : `${rawApiUrl.replace(/\/+$/, "")}/v1/api`;

  const cookieHeader = request.headers.get("cookie") || "";

  // If no cookies at all, unauthenticated immediately
  if (!cookieHeader) {
    return { authenticated: false as const };
  }

  let response: Response | null = null;
  try {
    response = await fetch(`${apiBaseUrl}/auth/me`, {
      method: "GET",
      headers: { Cookie: cookieHeader },
    });
  } catch {
    return { authenticated: false as const };
  }

  // Try refresh on 401
  if (!response || !response.ok) {
    try {
      const refreshResponse = await fetch(`${apiBaseUrl}/auth/refresh-token`, {
        method: "POST",
        headers: { Cookie: cookieHeader },
      });

      if (refreshResponse.ok) {
        // Refresh succeeded — forward new cookies to browser
        const newResponse = NextResponse.next();
        const newCookies = refreshResponse.headers.getSetCookie?.() || [];
        newCookies.forEach((cookie) => {
          newResponse.headers.append("Set-Cookie", cookie);
        });

        const setCookieHeader = refreshResponse.headers.get("set-cookie");
        if (setCookieHeader && newCookies.length === 0) {
          const cookies = setCookieHeader.split(",").map((c) => c.trim());
          cookies.forEach((cookie) => {
            newResponse.headers.append("Set-Cookie", cookie);
          });
        }

        return { authenticated: true as const, refreshResponse: newResponse };
      }
    } catch {
      return { authenticated: false as const };
    }

    return { authenticated: false as const };
  }

  return { authenticated: true as const };
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const loginUrl = new URL("/auth/login", request.url);

  // Let static files and Next internal assets through without auth checks
  const staticFileExt = /\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|otf|eot)$/;
  if (staticFileExt.test(pathname)) {
    return NextResponse.next();
  }

  // Bypass oauth callback
  if (pathname.startsWith("/auth/callback")) {
    return NextResponse.next();
  }

  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));
  const isProtectedRoute = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));

  // Auth routes (login, register): if already logged in → redirect to home (/), else allow
  if (isAuthRoute) {
    const authStatus = await fetchAuthStatus(request);
    if (authStatus.authenticated) {
      if ("refreshResponse" in authStatus && authStatus.refreshResponse) {
        const redirect = NextResponse.redirect(new URL("/", request.url));
        authStatus.refreshResponse.headers.getSetCookie?.().forEach((cookie) => {
          redirect.headers.append("Set-Cookie", cookie);
        });
        return redirect;
      }
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // Protected routes: if not logged in → redirect to /auth/login, else allow
  if (isProtectedRoute) {
    const authStatus = await fetchAuthStatus(request);
    if (!authStatus.authenticated) {
      return NextResponse.redirect(loginUrl);
    }
    if ("refreshResponse" in authStatus && authStatus.refreshResponse) {
      return authStatus.refreshResponse;
    }
    return NextResponse.next();
  }

  // Public routes (including / and /videos):
  // If user has cookies that refreshed, pass the new cookies forward, but do NOT redirect
  const cookieHeader = request.headers.get("cookie") || "";
  if (cookieHeader.includes("accessToken") || cookieHeader.includes("refreshToken")) {
    const authStatus = await fetchAuthStatus(request);
    if ("refreshResponse" in authStatus && authStatus.refreshResponse) {
      return authStatus.refreshResponse;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|assets).*)"],
};
