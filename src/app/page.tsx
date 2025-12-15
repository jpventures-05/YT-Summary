
import { Header } from "@/components/Header"
import { FeedItem } from "@/components/FeedItem"
import { createClient } from '@supabase/supabase-js'

// We can use a Server Component to fetch initial data directly from Supabase
// BUT we need to be careful about caching. Next.js caches fetch requests.
// Supabase-js doesn't use fetch under the hood in a way Next intercepts easily for caching unless using fetch directly.
// We'll force dynamic rendering to always get fresh feed.

export const dynamic = 'force-dynamic'

export default async function Home() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  // Note: Client creation here in SC is for 'anon' public access. 
  // Ideally we use cookies() for auth, but for public feed logic is fine.
  // Actually, we probably want to see *subscribed* videos only if logged in?
  // For MVP, user asked for "All / By Subscription Area".
  // Let's show ALL videos in the system for now (Global Feed) to start simple.

  // const { createClient } = require('@supabase/supabase-js')
  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data: videos, error } = await supabase
    .from('videos')
    .select('*')
    .order('published_at', { ascending: false })
    .limit(20)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="container max-w-2xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-6">Your Learning Feed</h1>

        {(!videos || videos.length === 0) && (
          <div className="text-center py-20 text-muted-foreground">
            <p>No videos yet.</p>
            <p className="mt-2 text-sm">Go to "Manage Subs" to add some channels!</p>
          </div>
        )}

        <div className="space-y-6">
          {videos?.map((video: any) => (
            <FeedItem key={video.video_id} video={video} />
          ))}
        </div>
      </main>
    </div>
  );
}
