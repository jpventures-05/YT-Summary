
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sparkles, MessageSquare, Play, Loader2 } from "lucide-react"
import { summarizeVideo } from '@/app/actions/summarize'

interface FeedItemProps {
    video: any
}

export function FeedItem({ video }: FeedItemProps) {
    const [isSummarizing, setIsSummarizing] = useState(false)
    const [summaryData, setSummaryData] = useState(video.summary)

    const hasSummary = summaryData && Object.keys(summaryData).length > 0
    const title = hasSummary ? summaryData.teachingTitle : video.title
    const thumbnailUrl = `https://i.ytimg.com/vi/${video.video_id}/mqdefault.jpg`

    const handleSummarize = async () => {
        setIsSummarizing(true)
        try {
            const result = await summarizeVideo(video.video_id)
            if (result.success) {
                setSummaryData(result.summary)
            } else {
                alert("Failed to summarize: " + result.error)
            }
        } catch (e) {
            console.error(e)
        } finally {
            setIsSummarizing(false)
        }
    }

    return (
        <Card className="mb-6 overflow-hidden">
            {/* Cover Image */}
            <div className="relative h-48 w-full bg-muted">
                <img src={thumbnailUrl} alt={title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-2 left-4 text-white text-xs font-mono bg-black/50 px-2 py-1 rounded">
                    {new Date(video.published_at).toLocaleDateString()}
                </div>
            </div>

            <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle className="text-xl font-bold leading-tight">
                        {title}
                    </CardTitle>
                </div>
                <div className="flex gap-2 mt-2">
                    <Badge variant={hasSummary ? "default" : "secondary"}>
                        {hasSummary ? "Lesson Ready" : "Unprocessed"}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent>
                {hasSummary ? (
                    <div className="space-y-4">
                        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                            {summaryData.summaryHighlights?.map((point: string, i: number) => (
                                <li key={i}>{point}</li>
                            ))}
                        </ul>
                        <p className="text-sm font-medium border-l-4 border-primary pl-3 py-1 bg-muted/50 rounded-r">
                            💡 Thesis: {summaryData.thesis}
                        </p>
                    </div>
                ) : (
                    <p className="text-muted-foreground italic">
                        Get the key lessons from this video without watching the whole thing.
                    </p>
                )}
            </CardContent>

            <CardFooter className="flex justify-between border-t pt-4 bg-muted/20">
                {hasSummary ? (
                    <Link href={`/video/${video.video_id}`} className="w-full">
                        <Button variant="default" className="w-full">
                            <BookOpenTextIcon className="mr-2 h-4 w-4" /> View Full Lesson
                        </Button>
                    </Link>
                ) : (
                    <Button
                        onClick={handleSummarize}
                        disabled={isSummarizing}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                        {isSummarizing ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Teaching...</>
                        ) : (
                            <><Sparkles className="mr-2 h-4 w-4" /> Teach Me This (AI)</>
                        )}
                    </Button>
                )}
            </CardFooter>
        </Card>
    )
}

function BookOpenTextIcon(props: any) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
    )
}
