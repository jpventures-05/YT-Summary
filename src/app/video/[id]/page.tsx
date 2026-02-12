
import { createClient } from '@supabase/supabase-js'
import { Header } from "@/components/Header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Chat } from "@/components/Chat"
import { BackToFeed } from "@/components/BackToFeed"
import { ArrowLeft } from "lucide-react"
import Link from 'next/link'
import { marked } from 'marked'
import { SaveButton } from "@/components/SaveButton"

// Force dynamic because we want fresh data
export const dynamic = 'force-dynamic'

export default async function LessonPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params
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
                <Header />
                <div className="mt-8 text-center">
                    <h1 className="text-xl mb-4">Lesson not found or not yet processed.</h1>
                    <p className="mb-4 text-muted-foreground">If you just added this, give the AI a moment to think!</p>
                    <Link href="/"><Button variant="outline">Back to Feed</Button></Link>
                </div>
            </div>
        )
    }

    const s = video.summary as any

    // Helper to render MD
    const renderMarkdown = async (text: string) => {
        if (!text) return ''
        return await marked.parse(text)
    }

    return (
        <div className="min-h-screen bg-background">
            <Header />
            <main className="container max-w-5xl mx-auto py-8 px-4 grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: The Lesson Content */}
                <div className="lg:col-span-2 space-y-10">
                    <BackToFeed />

                    <div className="flex justify-between items-start gap-4">
                        <div>
                            <Badge variant="outline" className="mb-3">AI Lesson</Badge>
                            <h1 className="text-3xl font-extrabold tracking-tight lg:text-4xl mb-3">{s.teachingTitle || video.title}</h1>
                            <p className="text-muted-foreground text-lg italic">{s.coreThesis || s.thesis}</p>

                            {/* Force Summarize Button for Debugging */}
                            <div className="mt-4 flex gap-2">
                                <Button variant="secondary" size="sm" onClick={async () => {
                                    const { summarizeVideo } = await import('@/app/actions/summarize');
                                    const res = await summarizeVideo(video.video_id, 'full');
                                    alert(res.success ? "Success!" : "Error: " + res.error);
                                    window.location.reload();
                                }}>
                                    (Debug) Force Summarize
                                </Button>
                            </div>
                        </div>
                        <div className="shrink-0 pt-1">
                            <SaveButton videoId={video.video_id} />
                        </div>
                    </div>


                    <div className="prose dark:prose-invert max-w-none space-y-12">

                        {/* Detailed Analysis (Moved to top) */}
                        {s.detailedSummary && (
                            <section>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="h-8 w-1 bg-primary rounded-full"></div>
                                    <h2 className="text-2xl font-bold m-0">Detailed Analysis</h2>
                                </div>
                                <div className="markdown-content text-lg leading-relaxed space-y-4" dangerouslySetInnerHTML={{ __html: await renderMarkdown(s.detailedSummary) }} />
                            </section>
                        )}

                        {/* Key Takeaways */}
                        <section>
                            <h2 className="text-xl font-bold flex items-center mb-4">🔑 Key Takeaways</h2>
                            <ul className="space-y-2">
                                {(s.keyTakeaways || []).map((t: string, i: number) => (
                                    <li key={i} className="leading-relaxed">{t}</li>
                                ))}
                            </ul>
                        </section>

                        {/* Main Lesson */}
                        <section className="bg-muted/30 p-6 rounded-xl border">
                            <h2 className="text-xl font-bold mb-4 mt-0">🎓 Main Lesson</h2>
                            <div className="markdown-content" dangerouslySetInnerHTML={{ __html: await renderMarkdown(s.mainLesson || s.conceptDeepDive || '') }} />
                        </section>

                        {/* Frameworks */}
                        {s.frameworks && (
                            <section>
                                <h2 className="text-xl font-bold mb-4">🧩 Frameworks & Models</h2>
                                <div className="markdown-content" dangerouslySetInnerHTML={{ __html: await renderMarkdown(s.frameworks) }} />
                            </section>
                        )}

                        {/* Practical Application */}
                        {s.practicalApplication && (
                            <section className="bg-green-50 dark:bg-green-950/20 p-6 rounded-xl border border-green-100 dark:border-green-900">
                                <h2 className="text-xl font-bold text-green-900 dark:text-green-100 mt-0 mb-4">🚀 Practical Application</h2>
                                <div className="markdown-content text-green-800 dark:text-green-200" dangerouslySetInnerHTML={{ __html: await renderMarkdown(s.practicalApplication) }} />
                            </section>
                        )}

                        {/* Misunderstandings */}
                        {s.misunderstandings && s.misunderstandings.length > 0 && (
                            <section>
                                <h2 className="text-xl font-bold mb-4">⚠️ Common Misunderstandings</h2>
                                <ul className="list-disc pl-5 space-y-2">
                                    {s.misunderstandings.map((m: string, i: number) => (
                                        <li key={i}>{m}</li>
                                    ))}
                                </ul>
                            </section>
                        )}

                        {/* Memorable Summary */}
                        {s.memorableSummary && (
                            <section className="bg-blue-50 dark:bg-blue-950/20 p-6 rounded-xl border border-blue-100 dark:border-blue-900 text-center">
                                <h2 className="text-lg font-bold text-blue-900 dark:text-blue-100 mt-0 mb-2">🧠 Memorable Summary</h2>
                                <div className="text-blue-800 dark:text-blue-200 font-medium">
                                    {s.memorableSummary}
                                </div>
                            </section>
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
                <div className="lg:col-span-1">
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
