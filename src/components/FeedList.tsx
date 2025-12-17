'use client'

import { useState, useEffect } from 'react'
import { FeedItem } from "@/components/FeedItem"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { fetchVideos } from "@/app/actions/videos"
import { supabase } from '@/lib/supabaseClient'

interface FeedListProps {
    initialVideos: any[]
    channelId?: string
}

export function FeedList({ initialVideos, channelId }: FeedListProps) {
    const [videos, setVideos] = useState<any[]>(initialVideos)
    const [loading, setLoading] = useState(false)
    const [hasMore, setHasMore] = useState(true)
    const [subscribedChannelIds, setSubscribedChannelIds] = useState<string[]>([])
    const [isPersonalFeed, setIsPersonalFeed] = useState(!channelId)
    const LIMIT = 20

    // Fetch subscriptions if this is the main feed
    useEffect(() => {
        if (isPersonalFeed) {
            const initPersonalFeed = async () => {
                setLoading(true)
                const { data: { user } } = await supabase.auth.getUser()

                if (user) {
                    const { data: subs } = await supabase
                        .from('subscriptions')
                        .select('channel_id')
                        .eq('user_id', user.id)

                    const ids = subs?.map(s => s.channel_id) || []
                    setSubscribedChannelIds(ids)

                    // Fetch initial personalized videos
                    const personalVideos = await fetchVideos(0, LIMIT, undefined, ids)
                    setVideos(personalVideos || [])
                    if (personalVideos && personalVideos.length < LIMIT) {
                        setHasMore(false)
                    }
                } else {
                    // Not logged in? Show nothing or empty
                    setVideos([])
                    setHasMore(false)
                }
                setLoading(false)
            }
            initPersonalFeed()
        }
    }, [isPersonalFeed])

    const loadMore = async () => {
        setLoading(true)
        const offset = videos.length

        // Use subscribedChannelIds if this is a personal feed
        const newVideos = await fetchVideos(
            offset,
            LIMIT,
            channelId,
            isPersonalFeed ? subscribedChannelIds : undefined
        )

        if (newVideos && newVideos.length > 0) {
            setVideos([...videos, ...newVideos])
            if (newVideos.length < LIMIT) {
                setHasMore(false)
            }
        } else {
            setHasMore(false)
        }
        setLoading(false)
    }

    return (
        <div className="space-y-6">
            <div className="space-y-6">
                {videos.map((video: any) => (
                    <FeedItem key={video.video_id} video={video} />
                ))}
            </div>

            {hasMore && (
                <div className="flex justify-center pt-4 pb-8">
                    <Button
                        variant="outline"
                        size="lg"
                        onClick={loadMore}
                        disabled={loading}
                        className="min-w-[200px]"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Loading...
                            </>
                        ) : (
                            "Show More"
                        )}
                    </Button>
                </div>
            )}

            {!hasMore && videos.length > 0 && (
                <div className="text-center py-8 text-muted-foreground">
                    You've reached the end of the feed.
                </div>
            )}
        </div>
    )
}
