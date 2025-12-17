'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send } from "lucide-react"

export function Chat({ videoId, initialContext }: { videoId: string, initialContext: string }) {
    const [messages, setMessages] = useState<Array<{ id: string, role: string, content: string }>>([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages])

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!input.trim() || isLoading) return

        const userMsg = { id: Date.now().toString(), role: 'user', content: input }
        setMessages(prev => [...prev, userMsg])
        setInput('')
        setIsLoading(true)

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMsg], // Send history including the new user message
                    videoId,
                    context: initialContext
                })
            })

            if (!response.ok) throw new Error(response.statusText)
            if (!response.body) return

            // Create placeholder for AI response
            const aiMsgId = (Date.now() + 1).toString()
            setMessages(prev => [...prev, { id: aiMsgId, role: 'assistant', content: '' }])

            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let done = false
            let accumulatedText = ''

            while (!done) {
                const { value, done: doneReading } = await reader.read()
                done = doneReading
                const chunkValue = decoder.decode(value, { stream: true })
                accumulatedText += chunkValue

                setMessages(prev => prev.map(m =>
                    m.id === aiMsgId ? { ...m, content: accumulatedText } : m
                ))
            }

        } catch (error) {
            console.error("Chat Error:", error)
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: "⚠️ Sorry, I couldn't reach the server. Please try again."
            }])
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-4">
                {messages.length === 0 && (
                    <p className="text-sm text-center text-muted-foreground mt-10">
                        Ask me anything about this lesson! <br />
                        "Explain the first point again?" <br />
                        "How do I apply this?"
                    </p>
                )}
                <div className="space-y-6">
                    {messages.map((m: any) => (
                        <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl px-5 py-3 ${m.role === 'user'
                                ? 'bg-primary text-primary-foreground rounded-tr-none'
                                : 'bg-muted rounded-tl-none'
                                }`}>
                                <div className="prose prose-sm dark:prose-invert max-w-none break-words whitespace-pre-wrap leading-relaxed">
                                    {m.content}
                                </div>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-muted rounded-2xl rounded-tl-none px-5 py-3">
                                <span className="animate-pulse text-sm">Thinking...</span>
                            </div>
                        </div>
                    )}
                    <div ref={scrollRef} />
                </div>
            </div>
            <form onSubmit={onSubmit} className="p-4 border-t flex gap-2">
                <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask a question..."
                    className="flex-1"
                />
                <Button type="submit" size="icon" disabled={isLoading}>
                    <Send className="h-4 w-4" />
                </Button>
            </form>
        </div>
    )
}
