'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Bookmark, Plus, Folder, Check } from "lucide-react"
import { supabase } from '@/lib/supabaseClient'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

interface SaveButtonProps {
    videoId: string
}

export function SaveButton({ videoId }: SaveButtonProps) {
    const [isSaved, setIsSaved] = useState(false)
    const [savedId, setSavedId] = useState<string | null>(null)
    const [isOpen, setIsOpen] = useState(false)
    const [collections, setCollections] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [userId, setUserId] = useState<string | null>(null)

    const [currentCollectionId, setCurrentCollectionId] = useState<string | null>(null)

    // New Collection State
    const [isCreating, setIsCreating] = useState(false)
    const [newCollectionName, setNewCollectionName] = useState('')

    // Fetch initial status
    useEffect(() => {
        const checkStatus = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            setUserId(user.id)

            // Check if saved
            const { data } = await supabase
                .from('saved_lessons')
                .select('id, collection_id')
                .eq('user_id', user.id)
                .eq('video_id', videoId)
                .maybeSingle() // Use maybeSingle to avoid 406 error if not found

            if (data) {
                setIsSaved(true)
                setSavedId(data.id)
                setCurrentCollectionId(data.collection_id)
            }
        }
        checkStatus()
    }, [videoId])

    // Load collections when modal opens
    useEffect(() => {
        if (isOpen && userId) {
            const fetchCollections = async () => {
                const { data } = await supabase
                    .from('collections')
                    .select('*')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false })
                setCollections(data || [])
            }
            fetchCollections()
        }
    }, [isOpen, userId])

    const handleSave = async (collectionId?: string) => { // collectionId undefined means None/General
        if (!userId) return alert("Please log in to save lessons.")

        setLoading(true)

        // Processing Save (Insert) or Move
        const { data, error } = await supabase
            .from('saved_lessons')
            .upsert({
                user_id: userId,
                video_id: videoId,
                collection_id: collectionId || null
            }, { onConflict: 'user_id, video_id' })
            .select()
            .single()

        if (!error && data) {
            setIsSaved(true)
            setSavedId(data.id)
            setCurrentCollectionId(data.collection_id)
            setIsOpen(false)
        }
        setLoading(false)
    }

    const handleUnsave = async () => {
        if (!userId) return

        setLoading(true)
        const { error } = await supabase.from('saved_lessons').delete().eq('user_id', userId).eq('video_id', videoId)
        if (!error) {
            setIsSaved(false)
            setSavedId(null)
            setCurrentCollectionId(null)
            setIsOpen(false)
        }
        setLoading(false)
    }

    const handleCreateCollection = async () => {
        if (!newCollectionName.trim() || !userId) return
        const { data, error } = await supabase
            .from('collections')
            .insert({ user_id: userId, name: newCollectionName })
            .select()
            .single()

        if (data) {
            setCollections([data, ...collections])
            setNewCollectionName('')
            setIsCreating(false)
            // Auto select this new collection
            handleSave(data.id)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className={isSaved ? "text-primary" : "text-muted-foreground"}>
                    <Bookmark className={isSaved ? "fill-current" : ""} />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Save to Library</DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Default 'All Saved' Option */}
                    <div
                        onClick={() => handleSave(undefined)}
                        className="flex items-center p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors border border-transparent hover:border-border"
                    >
                        <div className="bg-primary/10 p-2 rounded-md mr-3">
                            <Bookmark className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 font-medium">General / All Saved</div>
                        {isSaved && currentCollectionId === null && (
                            <Check className="h-4 w-4 text-primary" />
                        )}
                    </div>

                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-2 mb-1">
                        Collections
                    </div>

                    {collections.map(col => (
                        <div
                            key={col.id}
                            onClick={() => handleSave(col.id)}
                            className="flex items-center p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                        >
                            <Folder className="h-5 w-5 mr-3 text-muted-foreground" />
                            <span className="flex-1">{col.name}</span>
                            {isSaved && currentCollectionId === col.id && (
                                <Check className="h-4 w-4 text-primary" />
                            )}
                        </div>
                    ))}

                    {/* Create New Flow */}
                    {isCreating ? (
                        <div className="flex items-center gap-2 mt-2 animate-in fade-in slide-in-from-top-1">
                            <Input
                                value={newCollectionName}
                                onChange={(e) => setNewCollectionName(e.target.value)}
                                placeholder="Collection Name..."
                                className="h-9"
                                autoFocus
                            />
                            <Button size="sm" onClick={handleCreateCollection} disabled={!newCollectionName}>
                                Create
                            </Button>
                        </div>
                    ) : (
                        <Button
                            variant="outline"
                            className="justify-start mt-2"
                            onClick={() => setIsCreating(true)}
                        >
                            <Plus className="mr-2 h-4 w-4" /> Create New Collection
                        </Button>
                    )}
                </div>

                <DialogFooter className="sm:justify-between">
                    {isSaved && (
                        <Button variant="destructive" size="sm" onClick={handleUnsave} className="w-full sm:w-auto">
                            Remove from Saved
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
