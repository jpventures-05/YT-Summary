'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { FeedItem } from '@/components/FeedItem'
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Bookmark, FolderOpen, Layers, Trash2 } from 'lucide-react'
import { Header } from '@/components/Header'
import { Sidebar } from '@/components/Sidebar'

export default function LibraryPage() {
    const [savedItems, setSavedItems] = useState<any[]>([])
    const [collections, setCollections] = useState<any[]>([])
    const [selectedCollection, setSelectedCollection] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    const fetchLibrary = async () => {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return setLoading(false)

        // Fetch Collections
        const { data: cols } = await supabase
            .from('collections')
            .select('*')
            .eq('user_id', user.id)
            .order('name')

        setCollections(cols || [])

        // Fetch Saved Lessons (Joined with Videos)
        // We need to fetch 'saved_lessons' and join 'videos'.
        let query = supabase
            .from('saved_lessons')
            .select(`
                id, 
                collection_id,
                created_at,
                videos (*)
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        if (selectedCollection) {
            query = query.eq('collection_id', selectedCollection)
        }

        const { data: items, error } = await query

        if (error) {
            console.error('Library Fetch Error:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code,
                fullError: error
            })
        }

        // Transform to just video objects for FeedItem, maybe inject 'savedContext'?
        // FeedItem expects 'video'. 
        // We can just iterate and render FeedItems.
        setSavedItems(items || [])
        setLoading(false)
    }

    const handleDeleteCollection = async (id: string) => {
        if (!confirm("Are you sure you want to delete this collection? Items inside will remain saved in 'All Saved'.")) return

        const { error } = await supabase.from('collections').delete().eq('id', id)
        if (!error) {
            setCollections(collections.filter(c => c.id !== id))
            if (selectedCollection === id) setSelectedCollection(null)
        } else {
            alert("Error deleting collection")
        }
    }

    useEffect(() => {
        fetchLibrary()
    }, [selectedCollection])

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Header />
            <main className="container max-w-6xl mx-auto py-8 px-4 grid grid-cols-1 md:grid-cols-4 gap-8">

                <div className="hidden md:block col-span-1 sticky top-24 h-fit">
                    <Sidebar />
                </div>

                <div className="col-span-3">
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-2xl font-bold flex items-center">
                            <Bookmark className="mr-2 h-6 w-6 text-primary" />
                            My Library
                        </h1>
                    </div>

                    {/* Collection Filters */}
                    <div className="flex flex-wrap gap-4 mb-8 items-center bg-muted/20 p-4 rounded-xl">
                        <Button
                            variant={selectedCollection === null ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedCollection(null)}
                            className="rounded-full"
                        >
                            <Layers className="mr-2 h-4 w-4" /> All Saved
                        </Button>
                        <div className="h-6 w-px bg-border mx-2" />
                        {collections.map(col => (
                            <div key={col.id} className="flex items-center group">
                                <Button
                                    variant={selectedCollection === col.id ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setSelectedCollection(col.id)}
                                    className="rounded-l-full rounded-r-none border-r-0"
                                >
                                    <FolderOpen className="mr-2 h-4 w-4" /> {col.name}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-9 w-8 rounded-r-full rounded-l-none border-l-[1px] text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => handleDeleteCollection(col.id)}
                                    title="Delete Collection"
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        ))}
                    </div>

                    {/* Content Grid */}
                    {loading ? (
                        <div className="py-20 text-center text-muted-foreground">Loading library...</div>
                    ) : savedItems.length === 0 ? (
                        <div className="py-20 text-center border-dashed border-2 rounded-xl bg-muted/30">
                            <p className="text-muted-foreground">No saved lessons {selectedCollection ? "in this collection" : "yet"}.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {savedItems.map((item) => (
                                <div key={item.id} className="relative group">
                                    {/* Optional: Show which collection it belongs to above the card? */}
                                    {item.collection_id && (
                                        <div className="mb-2 flex justify-end">
                                            <Badge variant="outline" className="text-xs text-muted-foreground">
                                                <FolderOpen className="mr-1 h-3 w-3" />
                                                {collections.find(c => c.id === item.collection_id)?.name}
                                            </Badge>
                                        </div>
                                    )}
                                    <FeedItem video={item.videos} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
