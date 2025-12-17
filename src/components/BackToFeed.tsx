'use client'

import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export function BackToFeed() {
    const router = useRouter()

    return (
        <Button
            variant="ghost"
            className="pl-0 hover:bg-transparent hover:text-primary transition-colors mb-4 text-muted-foreground"
            onClick={() => router.back()}
        >
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to Feed
        </Button>
    )
}
