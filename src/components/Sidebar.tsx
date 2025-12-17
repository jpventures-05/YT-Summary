'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { usePathname } from 'next/navigation'
import { Hash, Home, Bookmark, User, Search } from 'lucide-react'
import { Input } from "@/components/ui/input"
import { cn } from '@/lib/utils'

export function Sidebar() {
    const [subs, setSubs] = useState<any[]>([])
    const [profile, setProfile] = useState<any>(null)
    const [search, setSearch] = useState('')
    const pathname = usePathname()

    const filtered = subs.filter(sub => sub.title.toLowerCase().includes(search.toLowerCase()))

    useEffect(() => {
        const fetchSubs = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                // Fetch Subscriptions
                const { data } = await supabase
                    .from('subscriptions')
                    .select('channels(id, title)')
                    .eq('user_id', user.id)

                if (data) {
                    setSubs(data.map((item: any) => item.channels))
                }

                // Fetch Profile for Username
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('username')
                    .eq('id', user.id)
                    .single()

                setProfile(profileData)
            }
        }
        fetchSubs()
    }, [])

    return (
        <div className="space-y-4 py-4">
            <div className="px-3 py-2">
                <h2 className="mb-2 px-4 text-sm font-semibold tracking-tight">
                    Discovery
                </h2>
                <div className="space-y-1">
                    <Link href="/">
                        <div className={cn(
                            "flex items-center rounded-lg px-4 py-2 font-medium transition-colors hover:text-primary",
                            pathname === "/" ? "bg-muted text-primary" : "text-muted-foreground"
                        )}>
                            <Home className="mr-2 h-4 w-4" />
                            All Feed
                        </div>
                    </Link>
                    <Link href="/library">
                        <div className={cn(
                            "flex items-center rounded-lg px-4 py-2 font-medium transition-colors hover:text-primary",
                            pathname === "/library" ? "bg-muted text-primary" : "text-muted-foreground"
                        )}>
                            <Bookmark className="mr-2 h-4 w-4" />
                            My Library
                        </div>
                    </Link>
                </div>
            </div>

            <div className="px-3 py-2">
                <h2 className="mb-2 px-4 text-sm font-semibold tracking-tight">
                    Your Channels
                </h2>
                <div className="px-4 mb-2">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-8 h-9"
                        />
                    </div>
                </div>
                {filtered.length === 0 ? (
                    <div className="px-4 text-sm text-muted-foreground">
                        {search ? 'No matches found.' : 'No subscriptions yet.'}
                    </div>
                ) : (
                    <div className="space-y-1">
                        {filtered.map((channel: any) => (
                            <Link key={channel.id} href={`/channels/${channel.id}`}>
                                <div className={cn(
                                    "flex items-center rounded-lg px-4 py-2 font-medium transition-colors hover:text-primary truncate",
                                    pathname === `/channels/${channel.id}` ? "bg-muted text-primary" : "text-muted-foreground"
                                )}>
                                    <Hash className="mr-2 h-4 w-4 shrink-0" />
                                    <span className="truncate">{channel.title}</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
            <div className="px-3 py-2 border-t mt-4">
                <h2 className="mb-2 px-4 text-sm font-semibold tracking-tight">
                    Account
                </h2>
                <div className="space-y-1">
                    <Link href="/profile">
                        <div className={cn(
                            "flex items-center rounded-lg px-4 py-2 font-medium transition-colors hover:text-primary",
                            pathname === "/profile" ? "bg-muted text-primary" : "text-muted-foreground"
                        )}>
                            <User className="mr-2 h-4 w-4" />
                            {profile?.username ? `@${profile.username}` : 'Profile'}
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    )
}
