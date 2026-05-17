import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // getUser(). A simple mistake can make it very hard to debug
  // issues with users being logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()

  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/signup') &&
    !request.nextUrl.pathname.startsWith('/auth')
  ) {
    // no user, potentially respond by redirecting the user to the login page
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user) {
    // If user is logged in and trying to access login/signup, redirect to dashboard
    if (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup' || request.nextUrl.pathname === '/') {
      // We need to know the role to redirect correctly
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      
      const role = profile?.role || 'employee'
      url.pathname = `/${role}/dashboard`
      return NextResponse.redirect(url)
    }

    // Role-based route protection
    const path = request.nextUrl.pathname
    if (path.startsWith('/employee') || path.startsWith('/manager') || path.startsWith('/admin')) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      
      const role = profile?.role

      if (path.startsWith('/admin') && role !== 'admin') {
        const targetPath = role ? `/${role}/dashboard` : '/login'
        url.pathname = targetPath
        return NextResponse.redirect(url)
      }
      if (path.startsWith('/manager') && role !== 'manager' && role !== 'admin') {
        const targetPath = role ? `/${role}/dashboard` : '/login'
        url.pathname = targetPath
        return NextResponse.redirect(url)
      }
      if (path.startsWith('/employee') && role !== 'employee' && role !== 'manager' && role !== 'admin') {
        if (!role) {
          console.log('Middleware: No role found for user, allowing through to avoid loop')
          return supabaseResponse
        }
        url.pathname = '/login'
        return NextResponse.redirect(url)
      }
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as is. If you're creating a
  // new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally: return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session.

  return supabaseResponse
}
