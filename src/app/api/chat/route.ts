
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
        system: `
### 🎯 **Metaprompt: Video Summarizer**

You are a **Video Summarizer AI**. Your task is to analyze and summarize the contents of the video based on the provided transcript.

### ✅ **Your Output Should Include:**

   - Summarize the content relevant to the user's question.
   - Use Headlines, Bullets, and Numbered lists for clarity.
   - **Do NOT include timestamps.**

### 🧠 Tone & Formatting Guidelines
- Be **clear**, **professional**, and **concise**.
- Use Bullet points for key concepts.
- Headings for logical sections.

### 🧭 Context
Video Title: ${video.title}
    
Transcript:
${context}
    `,
        messages,
    });

    return result.toTextStreamResponse();
}
