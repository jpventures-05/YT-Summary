
import OpenAI from 'openai'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

export async function generateVideoSummary(transcript: string, title: string) {
    // Truncate transcript if too long (approx 100k chars for fast processing, though 128k context is fine)
    const truncatedTranscript = transcript.substring(0, 50000)

    const prompt = `
  You are an expert teacher. 
  Your goal is to turn this YouTube video transcript into a concise, high-value lesson.
  
  Video Title: "${title}"
  
  Please output a JSON object with the following structure:
  {
    "teachingTitle": "A catchy, educational title",
    "summaryHighlights": ["point 1", "point 2", "point 3"],
    "thesis": "One sentence main idea",
    "keyTakeaways": ["takeaway 1", "takeaway 2", "takeaway 3", "takeaway 4"],
    "conceptDeepDive": "A structured explanation of the core concept (HTML string allowed for simple formatting like <b>)",
    "actionItem": "One specific thing to do today"
  }

  Transcript:
  ${truncatedTranscript}
  `

    const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini', // or gpt-3.5-turbo if 4o unavailable, but 4o-mini is best value
        response_format: { type: "json_object" },
        messages: [
            { role: "system", content: "You are a helpful assistant that generates JSON lessons." },
            { role: "user", content: prompt }
        ]
    })

    return JSON.parse(response.choices[0].message.content || '{}')
}
