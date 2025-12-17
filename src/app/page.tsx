

import { Header } from "@/components/Header"
import { Sidebar } from "@/components/Sidebar"
import { FeedList } from "@/components/FeedList"
import { createClient } from '@supabase/supabase-js'

// We can use a Server Component to fetch initial data directly from Supabase
// BUT we need to be careful about caching. Next.js caches fetch requests.
// Supabase-js doesn't use fetch under the hood in a way Next intercepts easily for caching unless using fetch directly.
// We'll force dynamic rendering to always get fresh feed.

export const dynamic = 'force-dynamic'

export default async function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="container max-w-6xl mx-auto py-8 px-4 grid grid-cols-1 md:grid-cols-4 gap-8">

        {/* Left Sidebar */}
        <div className="hidden md:block col-span-1 sticky top-24 h-fit">
          <Sidebar />
        </div>

        {/* Main Feed */}
        <div className="col-span-3">
          <h1 className="text-2xl font-bold mb-6">Your Learning Feed</h1>

          <div className="space-y-6">
            <FeedList initialVideos={[]} />
          </div>
        </div>
      </main>
    </div>
  );
}
