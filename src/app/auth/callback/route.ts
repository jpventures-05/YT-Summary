
import { createClient } from '@/lib/supabaseServer'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    // next = where to redirect to after sign in
    const next = searchParams.get('next') ?? '/channels'

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            // Successful login -> Redirect to 'next' (or /channels)
            const forwardedHost = request.headers.get('x-forwarded-host') // if behind reverse proxy
            const isLocal = origin.includes('localhost')

            if (isLocal) {
                // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
                return NextResponse.redirect(`${origin}${next}`)
            } else if (forwardedHost) {
                return NextResponse.redirect(`https://${forwardedHost}${next}`)
            } else {
                return NextResponse.redirect(`${origin}${next}`)
            }
        }
    }

    // Auth error or no code
    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/login?error=auth_code_error`)
}
