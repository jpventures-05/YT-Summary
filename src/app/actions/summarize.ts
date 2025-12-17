
'use server'

import { createClient } from '@supabase/supabase-js'
import { YoutubeTranscript } from 'youtube-transcript'
import { generateVideoSummary } from '@/lib/openai'
import { revalidatePath } from 'next/cache'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function summarizeVideo(videoId: string, mode: 'quick' | 'full' = 'full') {
    try {
        // 1. Get video details
        const { data: video, error } = await supabase
            .from('videos')
            .select('*')
            .eq('video_id', videoId)
            .single()

        if (error || !video) throw new Error('Video not found')

        // 2. Fetch Transcript
        let transcriptText = video.transcript
        if (!transcriptText) {
            try {
                const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId)

                // Format with timestamps: [MM:SS] Text
                transcriptText = transcriptItems.map(item => {
                    const minutes = Math.floor(item.offset / 60 / 1000)
                    const seconds = Math.floor((item.offset / 1000) % 60)
                    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
                    return `[${timeStr}] ${item.text}`
                }).join('\n')

                // Save transcript
                await supabase
                    .from('videos')
                    .update({ transcript: transcriptText })
                    .eq('video_id', videoId)

            } catch (err) {
                console.error("Transcript Error:", err)
                // Check if disabled/unavailable
                throw new Error('Could not retrieve transcript. Video may not have captions.')
            }
        }

        // 3. Generate Summary with AI
        const summary = await generateVideoSummary(transcriptText, video.title, mode)

        // 4. Save Summary (Merge if upgrading)
        // If we are doing a full update, we can overwrite. 
        // If query was quick, we overwrite too. 
        // Supabase JSONB updates are full replaces unless using specific operators, passing the new object replaces the old 'summary' column value.
        // This is fine as 'full' contains everything 'quick' has.
        const { error: updateError } = await supabase
            .from('videos')
            .update({
                summary: summary,
                status: 'completed'
            })
            .eq('video_id', videoId)

        if (updateError) throw updateError

        revalidatePath('/')
        return { success: true, summary }

    } catch (err: any) {
        console.error("Summarize Error:", err)
        return { success: false, error: err.message }
    }
}
