
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function generateVideoSummary(transcript: string, title: string, mode: 'quick' | 'full' = 'full') {
  // Truncate transcript if too long (approx 100k chars for fast processing, though 128k context is fine)
  const truncatedTranscript = transcript.substring(0, 50000)

  let prompt = ''

  if (mode === 'quick') {
    prompt = `
    You are an expert teacher. Provide a quick 3-bullet overview of the video "${title}".
    
    Transcript:
    ${truncatedTranscript}

    Output JSON Structure:
    {
      "teachingTitle": "Catchy title",
      "coreThesis": "One sentence summary",
      "quickOverview": ["Point 1", "Point 2", "Point 3"]
    }
    
    Rules:
    - Exactly 3 bullet points for quickOverview.
    - Keep it very concise.
    `
  } else {
    prompt = `
    You are an expert teacher and summarizer. 
    Your job is to create a teaching-first summary of the video "${title}" so the reader can understand and apply the ideas without reading the original.
    
    Transcript:
    ${truncatedTranscript}

    Output JSON Structure:
    {
      "teachingTitle": "A catchy, educational title",
      "coreThesis": "Single main idea in plain language (1-2 sentences)",
      "quickOverview": ["3 concise bullet points for the feed card"],
      "keyTakeaways": ["Complete idea + brief 'why it matters' (5-12 bullets)"],
      "mainLesson": "Markdown string using headings, definitions, steps, and examples to teach the concepts.",
      "frameworks": "Markdown string recreating or inferring frameworks/models/lists.",
      "practicalApplication": "Markdown string with 3 use cases, quick-start checklist, and one-thing recommendation.",
      "misunderstandings": ["Misunderstanding 1: Correction", "Misunderstanding 2: Correction"],
      "memorableSummary": "One short paragraph recap + 3-line cheat sheet.",
      "detailedSummary": "Markdown string. Strict usage of # H1 for Title, ## H2 for Sections, ### H3 for Sub-sections. Ensure double newlines \\n\\n between all sections and paragraphs for clear spacing. Layout: 1. Title 2. Executive Summary 3. Comprehensive Breakdown (use sub-headers for each major concept) 4. Conclusion."
    }
    
    Rules:
    - Don't invent facts.
    - Remove filler.
    - Keep language simple, structured, and actionable.
    `
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: "You are a helpful assistant that generates JSON lessons." },
      { role: "user", content: prompt }
    ]
  })

  return JSON.parse(response.choices[0].message.content || '{}')
}
