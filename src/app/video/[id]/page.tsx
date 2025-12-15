
import { createClient } from '@supabase/supabase-js'
import { Header } from "@/components/Header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Chat } from "@/components/Chat"
import { ArrowLeft } from "lucide-react"
import Link from 'next/link'

// Force dynamic because we want fresh data
export const dynamic = 'force-dynamic'

export default async function LessonPage({ params }: { params: { id: string } }) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: video, error } = await supabase
        .from('videos')
        .select('*')
        .eq('video_id', params.id)
        .single()

    if (error || !video || !video.summary) {
        return (
            <div className="container py-8">
                <h1 className="text-xl">Lesson not found or not yet processed.</h1>
                <Link href="/"><Button variant="outline" className="mt-4">Back to Feed</Button></Link>
            </div>
        )
    }

    const s = video.summary

    return (
        <div className="min-h-screen bg-background">
            <Header />
            <main className="container max-w-4xl mx-auto py-8 px-4 grid grid-cols-1 md:grid-cols-3 gap-8">

                {/* Left Column: The Lesson Content */}
                <div className="md:col-span-2 space-y-8">
                    <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-4">
                        <ArrowLeft className="mr-1 h-4 w-4" /> Back to Feed
                    </Link>

                    <div>
                        <Badge variant="outline" className="mb-2">Lesson</Badge>
                        <h1 className="text-3xl font-extrabold tracking-tight lg:text-4xl mb-2">{s.teachingTitle}</h1>
                        <p className="text-muted-foreground text-lg">{video.title}</p>
                    </div>

                    <div className="prose dark:prose-invert max-w-none">
                        <div className="p-4 bg-muted/30 rounded-lg border-l-4 border-primary">
                            <h3 className="text-lg font-semibold m-0">💡 Thesis</h3>
                            <p className="m-0 text-muted-foreground">{s.thesis}</p>
                        </div>

                        <h2>Key Takeaways</h2>
                        <ul>
                            {s.keyTakeaways?.map((t: string, i: number) => (
                                <li key={i}>{t}</li>
                            ))}
                        </ul>

                        <h2>Deep Dive</h2>
                        <div dangerouslySetInnerHTML={{ __html: s.conceptDeepDive }} />

                        {s.actionItem && (
                            <div className="mt-8 p-6 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900">
                                <h3 className="text-indigo-900 dark:text-indigo-100 font-bold m-0 flex items-center">
                                    ⚡ Action Item
                                </h3>
                                <p className="text-indigo-800 dark:text-indigo-200 mt-2 m-0">{s.actionItem}</p>
                            </div>
                        )}
                    </div>

                    <div className="pt-8 border-t">
                        <h3 className="font-semibold mb-2">Original Video</h3>
                        <iframe
                            className="w-full aspect-video rounded-lg"
                            src={`https://www.youtube.com/embed/${video.video_id}`}
                            title="YouTube video player"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    </div>
                </div>

                {/* Right Column: Chat Assistant */}
                <div className="md:col-span-1">
                    <div className="sticky top-20">
                        <div className="bg-card border rounded-xl shadow-sm overflow-hidden h-[600px] flex flex-col">
                            <div className="p-4 border-b bg-muted/40">
                                <h3 className="font-semibold flex items-center">
                                    💬 Chat with Lesson
                                </h3>
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <Chat videoId={video.video_id} initialContext={s.conceptDeepDive} />
                            </div>
                        </div>
                    </div>
                </div>

            </main>
        </div>
    )
}
