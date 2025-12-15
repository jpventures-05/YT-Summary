
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(req: Request) {
    const { messages, videoId } = await req.json()

    // 1. Fetch Video Context
    const { data: video } = await supabase
        .from('videos')
        .select('title, transcript, summary')
        .eq('video_id', videoId)
        .single()

    if (!video) {
        return new Response('Video not found', { status: 404 })
    }

    // 2. Construct System Context
    const summaryJson = video.summary as any
    const context = `
    Video Title: ${video.title}
    Thesis: ${summaryJson?.thesis || 'N/A'}
    Key Takeaways: ${summaryJson?.keyTakeaways?.join('. ') || 'N/A'}
    
    Transcript Context (Partial):
    ${video.transcript ? video.transcript.substring(0, 10000) : 'No transcript available.'}
  `

    // 3. Stream Response
    const result = await streamText({
        model: openai('gpt-3.5-turbo'),
        system: `You are a helpful teaching assistant. Answer the user's questions based STRICTLY on the following video context.
    If the answer is not in the context, say "I don't recall that being covered in the video."
    
    Context:
    ${context}
    `,
        messages,
    });

    return result.toDataStreamResponse();
}
