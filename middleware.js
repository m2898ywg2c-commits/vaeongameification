import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

// Refreshes the Supabase session cookie on every request. Without this the
// access token expires and you get silently logged out.
export async function middleware(request) {
  let response = NextResponse.next({ request: request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(function (c) {
            request.cookies.set(c.name, c.value);
          });
          response = NextResponse.next({ request: request });
          cookiesToSet.forEach(function (c) {
            response.cookies.set(c.name, c.value, c.options);
          });
        },
      },
    }
  );

  // Touching getUser is what triggers the refresh. Do not remove.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
