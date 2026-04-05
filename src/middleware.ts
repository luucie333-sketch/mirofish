import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED_PATHS = ['/chat', '/admin'];

function isProtected(pathname: string) {
  return PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // ── Auth gate: protected routes require sign-in ────────────────────────────
  if (isProtected(pathname) && !user) {
    const signInUrl = request.nextUrl.clone();
    signInUrl.pathname = '/auth/signin';
    return NextResponse.redirect(signInUrl);
  }

  // ── Credits gate: must have purchased before accessing protected routes ────
  if (isProtected(pathname) && user) {
    const [{ data: userData }, { count: purchaseCount }] = await Promise.all([
      supabase
        .from('users')
        .select('credits, role, subscription_tier, subscription_expires_at')
        .eq('id', user.id)
        .single(),
      supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('type', ['purchase', 'subscription_purchase']),
    ]);

    // Admins are never gated
    if (userData?.role === 'admin') return supabaseResponse;

    const hasCredits = (userData?.credits ?? 0) > 0;
    const isSubscribedActive =
      userData?.subscription_tier === 'unlimited' &&
      userData?.subscription_expires_at != null &&
      new Date(userData.subscription_expires_at) > new Date();
    const hasPurchased = (purchaseCount ?? 0) > 0;

    if (!hasCredits && !isSubscribedActive && !hasPurchased) {
      const buyUrl = request.nextUrl.clone();
      buyUrl.pathname = '/';
      buyUrl.search = '?buy=1';
      return NextResponse.redirect(buyUrl);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
