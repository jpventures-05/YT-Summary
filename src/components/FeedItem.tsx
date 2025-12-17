'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Loader2, RefreshCw } from "lucide-react"
import { summarizeVideo } from '@/app/actions/summarize'
import { SaveButton } from "@/components/SaveButton"

interface FeedItemProps {
    video: any
}

export function FeedItem({ video }: FeedItemProps) {
    const [isSummarizing, setIsSummarizing] = useState(false)
    const [summaryData, setSummaryData] = useState(video.summary)
    const [imgSrc, setImgSrc] = useState(`https://i.ytimg.com/vi/${video.video_id}/maxresdefault.jpg`)

    const hasSummary = summaryData && Object.keys(summaryData).length > 0
    const title = hasSummary ? summaryData.teachingTitle : video.title

    const isFullSummary = hasSummary && (summaryData.detailedSummary || summaryData.mainLesson)
    const router = useRouter()

    const handleSummarize = async (mode: 'quick' | 'full') => {
        setIsSummarizing(true)
        try {
            const result = await summarizeVideo(video.video_id, mode)
            if (result.success) {
                setSummaryData(result.summary)
                if (mode === 'full') {
                    // Refresh the feed view so when user comes back, it's updated
                    router.refresh()
                    // Navigate to the lesson page immediately
                    router.push(`/video/${video.video_id}`)
                    return
                }
            } else {
                alert("Failed to summarize: " + result.error)
            }
        } catch (e) {
            console.error(e)
        } finally {
            // Only stop loading if we are NOT navigating away
            if (mode !== 'full') {
                setIsSummarizing(false)
            }
        }
    }

    return (
        <Card className="mb-6 overflow-hidden">
            {/* Cover Image */}
            <div className="relative h-48 w-full bg-muted">
                <img
                    src={imgSrc}
                    alt={title}
                    className="w-full h-full object-cover"
                    onError={() => setImgSrc(`https://i.ytimg.com/vi/${video.video_id}/hqdefault.jpg`)}
                />
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
                    <Badge variant={isFullSummary ? "default" : hasSummary ? "secondary" : "outline"}>
                        {isFullSummary ? "Lesson Ready" : hasSummary ? "Quick Summary" : "Unprocessed"}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent>
                {hasSummary ? (
                    <div className="space-y-4">
                        <div className="text-sm font-medium border-l-4 border-primary pl-3 py-1 bg-muted/50 rounded-r">
                            💡 {summaryData.coreThesis || summaryData.thesis}
                        </div>
                        {(summaryData.quickOverview || summaryData.keyTakeaways || summaryData.summaryHighlights) && (
                            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                                {(summaryData.quickOverview || summaryData.keyTakeaways || summaryData.summaryHighlights || []).slice(0, 3).map((point: string, i: number) => (
                                    <li key={i}>{point}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                ) : (
                    <p className="text-muted-foreground italic">
                        Get the key lessons from this video without watching the whole thing.
                    </p>
                )}
            </CardContent>

            <CardFooter className="flex items-center gap-2 border-t pt-4 bg-muted/20">
                <div className="flex-1 flex flex-col sm:flex-row gap-2">
                    {isFullSummary ? (
                        <>
                            <Link href={`/video/${video.video_id}`} className="flex-1 w-full">
                                <Button variant="default" className="w-full">
                                    <BookOpenTextIcon className="mr-2 h-4 w-4" /> View Detailed Lesson
                                </Button>
                            </Link>
                            <Button variant="ghost" size="icon" onClick={() => handleSummarize('full')} disabled={isSummarizing} title="Regenerate">
                                {isSummarizing ? <Loader2 className="animate-spin h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
                            </Button>
                        </>
                    ) : hasSummary ? (
                        /* Partial / Quick Summary View */
                        <div className="w-full flex gap-2">
                            {/* User has Quick Summary, provide Update path */}
                            <Button
                                onClick={() => handleSummarize('full')}
                                disabled={isSummarizing}
                                variant="default"
                                className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0"
                            >
                                {isSummarizing ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                Detailed Lesson
                            </Button>
                        </div>
                    ) : (
                        /* No Summary - Show Dual Options */
                        <div className="grid grid-cols-2 gap-3 w-full">
                            <Button
                                onClick={() => handleSummarize('quick')}
                                disabled={isSummarizing}
                                variant="secondary"
                                className="w-full"
                            >
                                {isSummarizing ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : "⚡ Quick Overview"}
                            </Button>
                            <Button
                                onClick={() => handleSummarize('full')}
                                disabled={isSummarizing}
                                className="w-full"
                            >
                                {isSummarizing ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : "🎓 Detailed Lesson"}
                            </Button>
                        </div>
                    )}
                </div>
                <div className="shrink-0">
                    <SaveButton videoId={video.video_id} />
                </div>
            </CardFooter>
        </Card>
    )
}

function BookOpenTextIcon(props: any) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
    )
}
