'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { refreshFeeds } from "@/app/actions/refresh"
import { useRouter } from 'next/navigation'

export function RefreshFeed() {
    const [isRefreshing, setIsRefreshing] = useState(false)
    const router = useRouter()

    const handleRefresh = async () => {
        setIsRefreshing(true)
        try {
            const result = await refreshFeeds()
            if (result.error) {
                console.error(result.error)
                alert("Failed to refresh feeds.")
            } else {
                // Optional: Toast notification could go here
                console.log(result.message)
                router.refresh() // Refresh the current route to show new data
            }
        } catch (error) {
            console.error("Error calling refresh:", error)
        } finally {
            setIsRefreshing(false)
        }
    }

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Refresh Feed from YouTube"
        >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Syncing...' : 'Sync Feeds'}
        </Button>
    )
}
