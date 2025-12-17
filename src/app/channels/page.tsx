'use client'

import { AddChannel } from '@/components/AddChannel'
import { Button } from '@/components/ui/button'
import { refreshFeeds } from '@/app/actions/refresh'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Loader2, RefreshCw, Trash2, ArrowLeft, Search } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent } from '@/components/ui/card'

export default function ChannelsPage() {
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [subscriptions, setSubscriptions] = useState<any[]>([])
    const [loadingSubs, setLoadingSubs] = useState(true)
    const [search, setSearch] = useState('')

    const filteredSubs = subscriptions.filter(sub =>
        sub.channels?.title?.toLowerCase().includes(search.toLowerCase())
    )

    const fetchSubs = async () => {
        // ... existing fetchSubs implementation ...
        setLoadingSubs(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data, error } = await supabase
                .from('subscriptions')
                .select(`
                    id,
                    areas,
                    channels (
                        id,
                        title,
                        thumbnail_url
                    )
                `)
                .eq('user_id', user.id)

            if (error) {
                console.error('Error fetching subscriptions:', error)
            } else {
                setSubscriptions(data || [])
            }
        }
        setLoadingSubs(false)
    }

    useEffect(() => {
        fetchSubs()
    }, [])

    const handleRefresh = async () => {
        setIsRefreshing(true)
        await refreshFeeds()
        setIsRefreshing(false)
        fetchSubs() // Reload subs just in case
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Unsubscribe from this channel?')) return

        const { error } = await supabase
            .from('subscriptions')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting subscription:', error)
            alert('Failed to delete subscription')
            return
        }

        fetchSubs()
    }

    return (
        <div className="container mx-auto py-10 px-4">
            <div className="mb-6">
                <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
                    <ArrowLeft className="mr-1 h-4 w-4" /> Back to Feed
                </Link>
            </div>

            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Manage Subscriptions</h1>
                <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
                    {isRefreshing ? <Loader2 className="animate-spin mr-2" /> : <RefreshCw className="mr-2" />}
                    Refresh Feeds
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h2 className="text-xl font-semibold mb-4">Add New Channel</h2>
                    <AddChannel />
                </div>

                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold">Your Subscriptions ({filteredSubs.length})</h2>
                    </div>

                    <div className="relative mb-4">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search subscriptions..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-8"
                        />
                    </div>

                    {loadingSubs ? (
                        <div className="text-muted-foreground">Loading...</div>
                    ) : filteredSubs.length === 0 ? (
                        <p className="text-muted-foreground bg-muted p-4 rounded-lg">
                            {search ? 'No matching subscriptions.' : "You haven't subscribed to any channels yet."}
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {filteredSubs.map((sub) => (
                                <Card key={sub.id} className="overflow-hidden">
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            {/* Optional: Add user avatar/channel thumbnail here if available in sub.channels */}

                                            <div>
                                                <Link href={`/channels/${sub.channels?.id}`} className="hover:underline">
                                                    <h3 className="font-bold">{sub.channels?.title || 'Unknown Channel'}</h3>
                                                </Link>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => handleDelete(sub.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
