
import { createClient } from '@supabase/supabase-js'
import { Header } from "@/components/Header"
import { FeedList } from "@/components/FeedList"
import { Sidebar } from "@/components/Sidebar"
import { Badge } from "@/components/ui/badge"

// Force dynamic because we want fresh data
export const dynamic = 'force-dynamic'

export default async function ChannelDetailsPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Parallel fetch: Channel details + Videos
    const [channelResult, videosResult] = await Promise.all([
        supabase.from('channels').select('*').eq('id', params.id).single(),
        supabase.from('videos').select('*').eq('channel_id', params.id).order('published_at', { ascending: false })
    ])

    const channel = channelResult.data
    const videos = videosResult.data


    if (!channel) {
        return (
            <div className="container py-8 text-center">
                <Header />
                <h1 className="text-xl mt-8">Channel not found.</h1>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Header />
            <main className="container max-w-6xl mx-auto py-8 px-4 grid grid-cols-1 md:grid-cols-4 gap-8">

                {/* Left Sidebar */}
                <div className="hidden md:block col-span-1 sticky top-24 h-fit">
                    <Sidebar />
                </div>

                {/* Main Content */}
                <div className="col-span-3">
                    <div className="mb-8 flex items-center space-x-4">
                        {channel.thumbnail_url && (
                            <img
                                src={channel.thumbnail_url}
                                alt={channel.title}
                                className="w-16 h-16 rounded-full border bg-muted object-cover"
                            />
                        )}
                        <div>
                            <h1 className="text-3xl font-bold">{channel.title}</h1>
                            <div className="flex gap-2 mt-2">
                                <Badge variant="secondary">{videos?.length || 0} Videos</Badge>
                            </div>
                        </div>
                    </div>

                    {(!videos || videos.length === 0) && (
                        <div className="text-center py-20 text-muted-foreground">
                            <p>No videos found for this channel.</p>
                        </div>
                    )}

                    <div className="space-y-6">
                        <FeedList initialVideos={videos || []} channelId={params.id} />
                    </div>
                </div>
            </main>
        </div>
    )
}
