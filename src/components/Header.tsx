
'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BookOpen, Settings, LogIn } from 'lucide-react'

export function Header() {
    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center">
                <Link href="/" className="flex items-center space-x-2 mr-6">
                    <BookOpen className="h-6 w-6" />
                    <span className="font-bold inline-block">Learning Feed</span>
                </Link>
                <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
                    <nav className="flex items-center space-x-2">
                        <Link href="/channels">
                            <Button variant="ghost" size="sm">
                                <Settings className="h-4 w-4 mr-2" />
                                Manage Subs
                            </Button>
                        </Link>
                        <Link href="/login">
                            <Button variant="ghost" size="sm">
                                <LogIn className="h-4 w-4 mr-2" />
                                Login
                            </Button>
                        </Link>
                    </nav>
                </div>
            </div>
        </header>
    )
}
