import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import clsx from "clsx";

interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number
}

const URL = (import.meta.env.VITE_SERVER_URL as string) || "http://localhost:3000";

const socket: Socket = io(URL, {
    autoConnect: false,
    transports: ["websocket", "polling"],
    withCredentials: true
});

function getFormattedTimestamp() {
    const now = new Date();

    // 1. Format the time (11:17am)
    const timeString = now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    }).toLowerCase().replace(/\s/g, ''); // Removes space and makes 'AM' lowercase

    // 2. Format the date (May 13, 2025)
    const dateString = now.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    return `${timeString} – ${dateString}`;
}

export function ChatBot() {
    const { logout, isHubspotConnected } = useAuth()
    const [isConnected, setIsConnected] = useState(socket.connected);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [curTab, setCurTab] = useState(0)
    const [startDate, setStartDate] = useState(getFormattedTimestamp())
    const newThread = () => {
        if (!isConnected) return
        socket.emit('newThread')
        setStartDate(getFormattedTimestamp())
        setMessages([])
    }
    const connectHubSpot = () => {
        const clientId = import.meta.env.VITE_REACT_APP_HUBSPOT_CLIENT_ID;
        const redirectUri = "https://jumpapp-zeta.vercel.app/hubSpotAuth";
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
            setMessages(prev => [...prev, { role: 'system', content: msg, timestamp: Date.now() }]);
        });

        socket.on('receive', (msg: string) => {
            setIsLoading(false);
            setMessages(prev => [...prev, { role: 'assistant', content: msg, timestamp: Date.now() }]);
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
        if (!isConnected) {
            return toast.error('You are disconnected')
        }
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg: Message = { role: 'user', content: input, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);
        socket.emit('send', input);
        setInput("");
    };

    return (
        <div className="flex flex-col w-full h-screen bg-white overflow-hidden font-sans">
            {/* --- HEADER --- */}
            <header className="p-4 bg-white">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex justify-center gap-2">
                        <h2 className="text-2xl font-semibold text-gray-900">Ask Anything</h2>
                        <div className="flex justify-center mt-2">
                            <span className={`text-[10px] uppercase tracking-widest ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
                                ● {isConnected ? 'Connected' : 'Disconnected'}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={exit} className="text-gray-400 hover:text-gray-600">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-between border-b border-transparent">
                    <div className="flex gap-2 p-1">
                        <button onClick={() => setCurTab(0)} className={clsx("px-4 py-1.5 text-sm font-medium", { 'text-gray-500 hover:text-gray-700': curTab == 1, 'bg-gray-100 rounded-md shadow-sm text-gray-900': curTab == 0 })}>Chat</button>
                        <button onClick={() => setCurTab(1)} className={clsx("px-4 py-1.5 text-sm font-medium", { 'text-gray-500 hover:text-gray-700': curTab == 0, 'bg-gray-100 rounded-md shadow-sm text-gray-900': curTab == 1 })}>History</button>
                    </div>
                    <button disabled={isLoading} onClick={newThread} className={clsx("flex items-center gap-1.5 text-sm font-medium text-black px-3 py-1.5", { 'text-gray-200': isLoading })}>
                        <span className="text-lg">+</span> New thread
                    </button>
                </div>
            </header>

            {/* --- MAIN CONTENT AREA --- */}
            <main ref={scrollRef} className="flex-1 overflow-y-auto px-4 scroll-smooth">
                <div className="max-w-2xl mx-auto">
                    <div className="space-y-6">
                        <div className="flex flex-col items-center my-8">
                            <div className="flex items-center w-full">
                                <div className="flex-1 h-[1px] bg-gray-200"></div>
                                <span className="px-4 text-[13px] text-gray-400 font-medium">Context set to all meetings</span>
                                <div className="flex-1 h-[1px] bg-gray-200"></div>
                            </div>
                            <span className="text-[11px] text-gray-400 mt-1">{startDate}</span>
                        </div>
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {/* Container to stack bubble and timestamp */}
                                <div className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>

                                    <div className={`px-4 py-2 text-md ${msg.role === 'user'
                                        ? 'bg-blue-600 text-white rounded-2xl rounded-br-none'
                                        : msg.role == 'assistant' ? 'bg-gray-100 text-gray-800 rounded-2xl rounded-bl-none' : 'bg-white border border-gray-500 text-gray-800 rounded-2xl rounded-bl-none'
                                        }`}>
                                        {msg.content}
                                    </div>

                                    {/* Timestamp at bottom left of the bubble area */}
                                    <span className="text-[10px] text-gray-400 mt-1 px-1">
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        ))}

                        {/* Loading State */}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="flex gap-1 items-center px-2 py-1">
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main >

            {/* --- FOOTER / INPUT AREA --- */}
            < footer className="p-4 bg-white" >
                <div className="max-w-2xl mx-auto border border-gray-300 rounded-2xl overflow-hidden focus-within:ring-1 focus-within:ring-blue-500 transition-all">
                    <form onSubmit={handleSend} className="bg-white">
                        <div className="flex justify-between">
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
                                placeholder="Ask anything about your meetings..."
                                className="w-full px-4 pt-4 pb-2 focus:outline-none resize-none text-gray-700 placeholder-gray-400"
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isLoading || !isConnected}
                                className="mr-4 mt-1 flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 transition-all active:scale-95"
                            >
                                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                                </svg>
                            </button>
                        </div>
                        <div className="flex items-center justify-between px-3 py-3 border-t-0">
                            <div className="flex items-center gap-2">
                                {/* Plus Button */}
                                <button type="button" className="p-1.5 text-gray-800 hover:text-gray-600 border border-gray-200 rounded-lg border border-gray-300">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                </button>

                                {/* Meeting Selector */}
                                <button type="button" className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">
                                    All meetings
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                </button>

                                {/* Small Round Icons from Design */}
                                <div className="flex gap-2 ml-1">
                                    <button disabled={isHubspotConnected} onClick={connectHubSpot} title={isHubspotConnected ? "Hubspot Account is Connected" : "Connect Hubspot Account"} className="w-6 h-6 flex items-center justify-center bg-white border border-gray-300 rounded-full shadow-md px-1 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200">
                                        <svg fill={isHubspotConnected ? "#999999" : "#ee8260"} className="w-10 h-10" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" role="img"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><title>HubSpot icon</title><path d="M18.164 7.931V5.085a2.198 2.198 0 0 0 1.266-1.978V3.04A2.199 2.199 0 0 0 17.238.847h-.067a2.199 2.199 0 0 0-2.193 2.192v.067a2.196 2.196 0 0 0 1.252 1.973l.013.006v2.852a6.22 6.22 0 0 0-2.969 1.31l.012-.009-7.828-6.096a2.497 2.497 0 1 0-1.157 1.515l-.012.006 7.696 5.991a6.176 6.176 0 0 0-1.038 3.446c0 1.343.425 2.588 1.147 3.606l-.013-.019-2.342 2.342a1.968 1.968 0 0 0-.58-.095h-.002a2.033 2.033 0 1 0 2.033 2.033 1.978 1.978 0 0 0-.099-.595l.004.014 2.317-2.317a6.247 6.247 0 1 0 4.782-11.133l-.036-.005zm-.964 9.377a3.206 3.206 0 1 1 3.214-3.206v.002a3.206 3.206 0 0 1-3.206 3.206z"></path></g></svg>
                                    </button>

                                    <button title="Google account is connected" disabled className="w-6 h-6 flex items-center justify-center bg-white border border-gray-300 rounded-full shadow-md px-1 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200">
                                        <svg className="h-10 w-10" viewBox="0 0 48 48">
                                            <path fill="#999999" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                                            <path fill="#999999" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                                            <path fill="#999999" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                                            <path fill="#999999" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                                            <path fill="none" d="M0 0h48v48H0z"></path>
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <button
                                className="rounded-lg shadow-md p-2 text-gray-800 hover:text-blue-600 transition-colors border border-gray-300"
                            >
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" /></svg>
                            </button>
                        </div>

                    </form>
                </div>
            </footer >
        </div >
    );
}