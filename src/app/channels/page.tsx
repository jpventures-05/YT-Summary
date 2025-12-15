'use client'

import { AddChannel } from '@/components/AddChannel'
import { Button } from '@/components/ui/button'
import { refreshFeeds } from '@/app/actions/refresh'
import { useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'

export default function ChannelsPage() {
    const [isRefreshing, setIsRefreshing] = useState(false)

    const handleRefresh = async () => {
        setIsRefreshing(true)
        await refreshFeeds()
        setIsRefreshing(false)
        // In a real app we'd toast success
    }

    return (
        <div className="container mx-auto py-10">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Manage Subscriptions</h1>
                <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
                    {isRefreshing ? <Loader2 className="animate-spin mr-2" /> : <RefreshCw className="mr-2" />}
                    Refresh Feeds
                </Button>
            </div>
            <AddChannel />
            <div className="mt-8">
                {/* TODO: List subscribed channels */}
                <p className="text-center text-muted-foreground">No channels added yet.</p>
            </div>
        </div>
    )
}
