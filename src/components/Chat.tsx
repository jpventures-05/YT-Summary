
'use client'

import { useChat } from '@ai-sdk/react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send } from "lucide-react"

export function Chat({ videoId, initialContext }: { videoId: string, initialContext: string }) {
    const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
        api: '/api/chat',
        body: {
            videoId,
            context: initialContext // Pass some context directly or let server fetch
        }
    })

    return (
        <div className="flex flex-col h-full">
            <ScrollArea className="flex-1 p-4">
                {messages.length === 0 && (
                    <p className="text-sm text-center text-muted-foreground mt-10">
                        Ask me anything about this lesson! <br />
                        "Explain the first point again?" <br />
                        "How do I apply this?"
                    </p>
                )}
                {messages.map(m => (
                    <div key={m.id} className={`mb-4 flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`rounded-lg px-3 py-2 max-w-[85%] text-sm ${m.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                            }`}>
                            {m.content}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start mb-4">
                        <div className="bg-muted rounded-lg px-3 py-2 text-sm text-muted-foreground animate-pulse">
                            Thinking...
                        </div>
                    </div>
                )}
            </ScrollArea>
            <form onSubmit={handleSubmit} className="p-4 border-t flex gap-2">
                <Input
                    value={input}
                    onChange={handleInputChange}
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
