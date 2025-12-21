import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../context/AuthContext";

interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

const URL = (import.meta.env.VITE_SERVER_URL as string) || "http://localhost:3000";

const socket: Socket = io(URL, {
    autoConnect: false,
    transports: ["websocket"],
    withCredentials: true
});

export function ChatBot() {
    const { logout, isHubspotConnected } = useAuth()
    const [isConnected, setIsConnected] = useState(socket.connected);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const connectHubSpot = () => {
        const clientId = import.meta.env.VITE_REACT_APP_HUBSPOT_CLIENT_ID;
        // 1. This must be the ONE URL whitelisted n HubSpot Dev Portal
        const redirectUri = "http://localhost:4200/hubSpotAuth";

        // 3. Put that current URL into the 'state' parameter
        const scopes = "crm.objects.contacts.read crm.objects.deals.read crm.objects.orders.read crm.objects.contacts.write crm.schemas.contacts.write crm.objects.orders.write sales-email-read crm.schemas.contacts.read";
        const authUrl = `https://app.hubspot.com/oauth/authorize?` +
            `client_id=${clientId}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `scope=${encodeURIComponent(scopes)}`

        window.location.href = authUrl;
    }

    const exit = () => {
        if (!confirm('Are you sure to logo out?')) return
        logout()
    }

    useEffect(() => {
        socket.connect();
        socket.on('connect', () => setIsConnected(true));
        socket.on('disconnect', () => {
            setIsConnected(false)
            setMessages([])
        });
        socket.on('message', (msg: string) => {
            setIsConnected(false)
            setMessages(prev => [...prev, { role: 'system', content: msg }]);
        });

        socket.on('receive', (msg: string) => {
            setIsLoading(false);
            setMessages(prev => [...prev, { role: 'assistant', content: msg }]);
        });
        socket.on('exit', (msg: string) => {
            logout()
        });
        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off('chat message');
            socket.disconnect();
        };
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg: Message = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);
        socket.emit('send', input);
        setInput("");
    };

    return (
        <div className="flex flex-col w-full h-screen bg-white overflow-hidden transition-all h-full">
            {/* Simplified Header */}
            <header className="flex items-center justify-between p-4 border-b shrink-0 bg-white">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-gray-800">Ask Anything</h2>
                    <span
                        className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}
                        title={isConnected ? 'Online' : 'Offline'}
                    />
                </div>
                {!isHubspotConnected && <button className="border-1 border-[#888888] rounded p-1 border" onClick={connectHubSpot}>Connect Hubspot</button>}
                <button onClick={exit} className="text-gray-400 hover:text-gray-800 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </header>

            {/* Message Display Area */}
            <main
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 space-y-6 bg-white scroll-smooth"
            >
                {/* Constraining content width for readability on ultra-wide monitors */}
                <div className="max-w-3xl mx-auto space-y-6">
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[90%] sm:max-w-[80%] px-5 py-3 rounded-2xl text-[15px] leading-relaxed ${msg.role === 'user'
                                ? 'bg-blue-600 text-white rounded-br-none shadow-sm'
                                : msg.role == 'assistant' ? 'bg-gray-100 text-gray-800 rounded-bl-none border border-gray-200' : 'bg-white text-gray-500 rounded-bl-none border border-gray-500'
                                }`}>
                                {msg.content}
                            </div>
                        </div>
                    ))}

                    {/* AI Loading State */}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-gray-100 px-5 py-4 rounded-2xl rounded-bl-none flex gap-1.5 items-center border border-gray-200">
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Simplified Input Area */}
            <footer className="p-4 sm:p-6 bg-white border-t shrink-0">
                <div className="max-w-3xl mx-auto">
                    <form onSubmit={handleSend} className="relative group">
                        <textarea
                            rows={1}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend(e);
                                }
                            }}
                            placeholder="Ask anything about messages/contacts..."
                            className="w-full pl-5 pr-14 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all text-[0.8rem] md:text-lg"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading || !isConnected}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 transition-all active:scale-95"
                        >
                            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                            </svg>
                        </button>
                    </form>
                </div>
            </footer>
        </div>
    );
}