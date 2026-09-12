import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(
            ({ name, value, options }) => {
              response.cookies.set(
                name,
                value,
                options
              );
            }
          );
        },
      },
    }
  );

  const pathname =
    request.nextUrl.pathname;

/* =====================================================
   API 요청은 각 route.ts에서 인증 처리
===================================================== */

if (pathname.startsWith("/api/")) {
  return response;
}

  const {
    data: { user },
  } = await supabase.auth.getUser();

  /* =====================================================
     로그인 페이지
  ===================================================== */

  if (pathname === "/login") {
    if (user) {
      return NextResponse.redirect(
        new URL("/", request.url)
      );
    }

    return response;
  }

  /* =====================================================
     로그인하지 않은 사용자
  ===================================================== */

  if (!user) {
    return NextResponse.redirect(
      new URL("/login", request.url)
    );
  }

  /* =====================================================
     OMS 사용자 확인
  ===================================================== */

  const {
    data: omsUser,
    error,
  } = await supabase
    .from("oms_users")
    .select(
      "login_id, name, role, active"
    )
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (
    error ||
    !omsUser ||
    !omsUser.active
  ) {
    await supabase.auth.signOut();

    return NextResponse.redirect(
      new URL("/login", request.url)
    );
  }

  /* =====================================================
     관리자 페이지 권한
  ===================================================== */

  if (
    pathname.startsWith("/admin") &&
    omsUser.role !== "ADMIN"
  ) {
    return NextResponse.redirect(
      new URL("/", request.url)
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};