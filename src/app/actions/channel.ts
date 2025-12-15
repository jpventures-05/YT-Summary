
'use server'

import { createClient } from '@supabase/supabase-js'
import { resolveChannelInfo } from '@/lib/youtube'
import { revalidatePath } from 'next/cache'

// Note: In a real server component, we would use createServerClient from @supabase/ssr
// But for this MVP with client-side auth, we'll use the environment variables directly for the admin/service role 
// OR better: use the client passed from the frontend if we want RLS to work strictly as the user.
// However, 'addChannel' involves writing to the 'channels' table which might be protected.
// Let's use the service role key for the backend operations to ensure we can write to 'channels' 
// irrespective of user RLS, or ensure the user RLS allows it.
// Actually, our RLS says: "Authenticated users can create channels". 
// So we can use a client with the user's session, OR just use the anon key on the server 
// but we need to pass the user_id.

// To keep it simple for this MVP step:
// We will receive the channel URL and the userID (or we assume we are authenticated).
// Since we are in a Server Action, we can't easily get the client-side session without cookies.
// Let's stick to: Frontend calls this action, we use a global admin client to do the work 
// (or the anon client if RLS permits).
// RLS requires an authenticated user for 'channels' insert.
// So we really need the cookie-based auth flow for Next.js if we want to use RLS properly in Server Actions.
// BUT, to speed up this MVP, let's just use the metadata.
// Actually, let's simply instantiate a supabase client with the anon key. 
// If the user is logged in on the browsing context, sending a request to specific Next.js API routes 
// forwards cookies. Server Actions also handle cookies.

// Let's rely on the frontend to pass the user ID for now, or use @supabase/ssr later.
// For now, I will assume the 'channels' table is public writable for MVP or I will use the service role key?
// I don't have the service role key from the user (only anon).
// So I MUST rely on the user being logged in and RLS working with their token.
// Creating a proper Next.js implementation of Supabase Auth (SSR) is the robust way.
// I'll take a shortcut:
// The Server Action will take the `url` and `userId`.
// It will look up the channel info.
// It will insert into `channels` (using UPSERT to avoid duplicates).
// It will insert into `subscriptions`.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// We strictly need to respect RLS, so this client is 'anon'. 
// It won't work for insert unless we have the user's JWT.
// Server Actions are tricky with raw 'supabase-js' without the cookie handling.

// Pivot: implementing the logic in a Next.js API Route might be easier to debug, 
// OR just doing the logic inside the Component (Client Side) for the supabase calls, 
// and only using the Server Action for the "HTML Scraping" part (which requires Node).
// YES. That is the best pattern for MVP.
// 1. Client: calls Server Action "getChannelMetadata(url)".
// 2. Client: receives Metadata.
// 3. Client: calls supabase.from('channels').upsert(...) using its own valid session.
// 4. Client: calls supabase.from('subscriptions').insert(...).

export async function getChannelMetadata(url: string) {
    return await resolveChannelInfo(url)
}
