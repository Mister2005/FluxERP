'use client';

import { useState, useRef, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button'; // Assuming we have this, or I'll use standard button
import { Card } from '@/components/ui/Card';
import { Send, User, Bot, Loader2, Sparkles } from 'lucide-react';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export default function AIAssistantPage() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: 'Hello! I\'m your FluxERP AI assistant. I can help you analyze risks, suggest BOM optimizations, or answer questions about your products. How can I help you today?',
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Format AI response to remove markdown formatting and structure it properly
    const formatAIResponse = (text: string): string => {
        return text
            // Remove asterisks used for bold/italic
            .replace(/\*\*\*/g, '')
            .replace(/\*\*/g, '')
            .replace(/\*/g, '')
            // Remove hash symbols for headers but keep the text
            .replace(/#{1,6}\s/g, '')
            // Clean up extra whitespace
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    };

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ai/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ message: userMessage.content })
            });

            const data = await res.json();

            const botMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: formatAIResponse(data.response || 'Sorry, I encountered an error processing your request.'),
                timestamp: new Date()
            };

            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            console.error('AI Chat Error:', error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'I apologize, but I\'m having trouble connecting to the server right now.',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AppLayout>
            <div className="flex flex-col h-[calc(100vh-140px)]">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-[#3E2723] flex items-center">
                        <Sparkles className="w-6 h-6 mr-2 text-[#8D6E63]" />
                        AI Assistant
                    </h1>
                    <p className="text-gray-500">Ask questions about your data or get PLM insights</p>
                </div>

                <Card className="flex-1 flex flex-col overflow-hidden bg-white border border-gray-200 shadow-sm">
                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FAF8F6]">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`
                  flex max-w-[80%] rounded-2xl p-4 shadow-sm
                  ${msg.role === 'user'
                                        ? 'bg-[#8D6E63] text-white rounded-br-none'
                                        : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'}
                `}>
                                    <div className="mr-3 mt-1 flex-shrink-0">
                                        {msg.role === 'user' ? (
                                            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                                                <User className="w-5 h-5 text-white" />
                                            </div>
                                        ) : (
                                            <div className="w-8 h-8 bg-[#EFEBE9] rounded-full flex items-center justify-center">
                                                <Bot className="w-5 h-5 text-[#8D6E63]" />
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                        <span className={`text-[10px] block mt-1 ${msg.role === 'user' ? 'text-white/70' : 'text-gray-400'}`}>
                                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-none p-4 shadow-sm flex items-center">
                                    <div className="mr-3 w-8 h-8 bg-[#EFEBE9] rounded-full flex items-center justify-center">
                                        <Loader2 className="w-5 h-5 text-[#8D6E63] animate-spin" />
                                    </div>
                                    <span className="text-sm text-gray-500">Thinking...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-white border-t border-gray-100">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSend()}
                                placeholder="Type your message..."
                                className="flex-1 p-3 border border-gray-200 rounded-lg focus:outline-none focus:border-[#8D6E63] focus:ring-1 focus:ring-[#8D6E63]"
                                disabled={isLoading}
                            />
                            <button
                                onClick={handleSend}
                                disabled={isLoading || !input.trim()}
                                className="p-3 bg-[#8D6E63] text-white rounded-lg hover:bg-[#6D4C41] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-center text-xs text-gray-400 mt-2">
                            AI can make mistakes. Verify important information.
                        </p>
                    </div>
                </Card>
            </div>
        </AppLayout>
    );
}
