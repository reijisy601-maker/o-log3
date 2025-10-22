import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  console.log("[v0] Middleware: Request path:", path)

  const allCookies = request.cookies.getAll()
  console.log("[v0] Middleware: All cookies:", allCookies.map((c) => c.name).join(", "))

  const protectedPaths = ["/dashboard", "/admin"]
  const isProtectedPath = protectedPaths.some((p) => path.startsWith(p))

  if (!isProtectedPath) {
    console.log("[v0] Middleware: Public path, allowing request")
    return NextResponse.next()
  }

  console.log("[v0] Middleware: Protected path, checking auth")

  const supabaseCookie = allCookies.find((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"))

  if (!supabaseCookie) {
    console.log("[v0] Middleware: No Supabase auth cookie found, redirecting to /")
    return NextResponse.redirect(new URL("/", request.url))
  }

  console.log("[v0] Middleware: Auth cookie found:", supabaseCookie.name)
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
