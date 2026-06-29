import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Sparkles, RefreshCw, Bot } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function MeAIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Сайн уу! Би бол Чинхүслэнгийн AI туслах байна. Чинхүслэн маань harry potter, cs2, roblox, сагс тоглох дуртай бөгөөд ирээдүйд IT инженер болох мөрөөдөлтэй. Түүний portfolio болон сонирхлын талаар надаас юу ч хамаагүй асуугаарай! 😊"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    // Show a small bounce notification or let user know there is an AI assistant
    if (!isOpen) {
      const timer = setTimeout(() => {
        setHasNewMessage(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput("");

    const updatedMessages = [...messages, { role: "user" as const, content: userMsg }];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "me",
          messages: updatedMessages,
        }),
      });

      if (!response.ok) {
        throw new Error("Сүлжээний алдаа гарлаа.");
      }

      const data = await response.json();
      setMessages([...updatedMessages, { role: "assistant" as const, content: data.reply }]);
    } catch (error) {
      console.error("Error in chat:", error);
      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: "Алдаа гарлаа. Гэхдээ санаа зоволтгүй, Чинхүслэн маань хэзээд туслахад бэлэн шүү! Дахин оролдоод үзээрэй."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setHasNewMessage(false);
    }
  };

  const handleReset = () => {
    if (confirm("Чатны түүхийг устгах уу?")) {
      setMessages([
        {
          role: "assistant",
          content: "Сайн уу! Би бол Чинхүслэнгийн AI туслах байна. Чинхүслэн маань harry potter, cs2, roblox, сагс тоглох дуртай бөгөөд ирээдүйд IT инженер болох мөрөөдөлтэй. Түүний portfolio болон сонирхлын талаар надаас юу ч хамаагүй асуугаарай! 😊"
        }
      ]);
    }
  };

  return (
    <div id="me-ai-container" className="fixed bottom-6 right-6 z-[999] font-sans">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="me-ai-chatbox"
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute bottom-20 right-0 w-[320px] sm:w-[360px] h-[450px] bg-slate-950/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500/20 to-amber-600/20 border-b border-white/10 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#e8702a] to-amber-500 flex items-center justify-center text-white shadow-md">
                  <Bot size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-bold font-mono tracking-wide">Me-AI Туслах</h3>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase tracking-wider">ONLINE</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleReset}
                  title="Шинэчлэх"
                  className="p-1.5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors cursor-pointer"
                >
                  <RefreshCw size={12} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0 bg-black/10">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#e8702a] text-white self-end rounded-tr-none"
                      : "bg-white/10 text-white/90 self-start rounded-tl-none border border-white/5"
                  }`}
                >
                  {msg.content}
                </div>
              ))}
              {loading && (
                <div className="bg-white/5 text-white/60 self-start rounded-2xl rounded-tl-none border border-white/5 px-3 py-2 text-xs flex items-center gap-1.5 animate-pulse">
                  <Sparkles size={12} className="animate-spin text-[#e8702a]" />
                  Чинхүслэн AI бодож байна...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Footer Form */}
            <form onSubmit={handleSend} className="p-3 border-t border-white/10 bg-black/40 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Чинхүслэнгийн талаар асуух уу?"
                className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-[#e8702a] transition-all placeholder:text-white/40"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-[#e8702a] hover:bg-[#d2611f] disabled:bg-white/10 disabled:text-white/40 text-white p-2 rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0 w-9 h-9 shadow-md"
              >
                <Send size={14} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Button */}
      <div className="relative">
        {hasNewMessage && !isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute -top-12 right-0 bg-gradient-to-r from-[#e8702a] to-amber-500 text-white text-[10px] font-bold py-1 px-3 rounded-full shadow-lg whitespace-nowrap border border-white/10 animate-bounce cursor-pointer"
            onClick={handleToggle}
          >
            Надтай ярилцаарай! 👋
          </motion.div>
        )}
        <button
          onClick={handleToggle}
          id="me-ai-trigger-button"
          className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#e8702a] to-amber-500 text-white flex items-center justify-center shadow-lg shadow-black/30 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/10"
        >
          {isOpen ? <X size={22} /> : <MessageCircle size={22} />}
        </button>
      </div>
    </div>
  );
}
