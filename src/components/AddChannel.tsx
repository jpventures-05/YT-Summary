
'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Loader2, Plus } from "lucide-react"
import { supabase } from '@/lib/supabaseClient'
import { getChannelMetadata } from '@/app/actions/channel'
import { refreshFeeds } from '@/app/actions/refresh'

export function AddChannel() {
    const [url, setUrl] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const handleAddChannel = async () => {
        setIsLoading(true)
        setError('')
        setSuccess('')
        try {
            // 1. Check Auth
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                throw new Error('You must be logged in to add a channel.')
            }

            // 2. Resolve Metadata
            const metadata = await getChannelMetadata(url)
            if (!metadata) {
                throw new Error('Could not find a YouTube channel at this URL.')
            }

            // 3. Save to Channels Table
            const { error: channelError } = await supabase
                .from('channels')
                .upsert({
                    id: metadata.id,
                    title: metadata.title,
                    description: metadata.description,
                    thumbnail_url: metadata.thumbnailUrl,
                    custom_url: metadata.customUrl,
                    rss_url: metadata.rssUrl
                }, { onConflict: 'id', ignoreDuplicates: true })

            if (channelError) throw channelError

            // 4. Save (Upsert) Subscription
            const { error: subError } = await supabase
                .from('subscriptions')
                .upsert({
                    user_id: user.id,
                    channel_id: metadata.id,
                    areas: ['General']
                }, { onConflict: 'user_id, channel_id', ignoreDuplicates: true })

            if (subError) throw subError

            // 5. Trigger Refresh
            const refreshResult = await refreshFeeds()

            setSuccess(`Subscribed to ${metadata.title}!`)
            setUrl('')

        } catch (err: any) {
            console.error(err)
            setError(err.message || 'Failed to add channel.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Card className="w-full max-w-md mx-auto">
            <CardHeader>
                <CardTitle>Add Channel</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex space-x-2">
                    <Input
                        placeholder="Paste YouTube Channel URL"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        disabled={isLoading}
                    />
                    <Button onClick={handleAddChannel} disabled={!url || isLoading}>
                        {isLoading ? <Loader2 className="animate-spin" /> : <Plus />}
                    </Button>
                </div>
                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                {success && <p className="text-green-500 text-sm mt-2">{success}</p>}
            </CardContent>
        </Card>
    )
}
