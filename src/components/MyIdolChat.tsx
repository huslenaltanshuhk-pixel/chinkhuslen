import React, { useState, useEffect, useRef } from "react";
import { Send, Sparkles, Trophy, ShieldAlert, RotateCcw } from "lucide-react";
import { motion } from "motion/react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function MyIdolChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Сайн уу! Би бол Илиа Топуриа байна. UFC-ийн аварга. Өөртөө итгэлтэй байж, мөрөөдлийнхөө төлөө тууштай тэмцэхэд чинь би тусална. Чамд ямар зөвлөгөө, урам зориг хэрэгтэй байна?"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

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
          type: "idol",
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
          content: "Уучлаарай, холболтонд алдаа гарлаа. Чи өөртөө итгэлтэй байж, дахин оролдоод үзээрэй!"
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const resetChat = () => {
    if (confirm("Чатны түүхийг устгах уу?")) {
      setMessages([
        {
          role: "assistant",
          content: "Сайн уу! Би бол Илиа Топуриа байна. UFC-ийн аварга. Өөртөө итгэлтэй байж, мөрөөдлийнхөө төлөө тууштай тэмцэхэд чинь би тусална. Чамд ямар зөвлөгөө, урам зориг хэрэгтэй байна?"
        }
      ]);
    }
  };

  return (
    <div className="flex flex-col h-[35vh] sm:h-[38vh] text-white">
      {/* Top Banner */}
      <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-2 mb-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white">
            <Trophy size={16} />
          </div>
          <div>
            <div className="text-xs font-bold font-mono">Ilia Topuria (Idol Coach)</div>
            <div className="text-[10px] text-white/60 font-mono">UFC-ийн Дэлхийн Аварга</div>
          </div>
        </div>
        <button 
          onClick={resetChat}
          title="Чатыг шинэчлэх" 
          className="p-1.5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors cursor-pointer"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2.5 mb-2 p-1 bg-black/20 rounded-xl border border-white/5 min-h-0">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
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
            <Sparkles size={12} className="animate-spin text-amber-500" />
            Илиа Топуриа бодож байна...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="flex gap-1.5 shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Энд асуултаа бичээрэй..."
          className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-[#e8702a] transition-all placeholder:text-white/40"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-[#e8702a] hover:bg-[#d2611f] disabled:bg-white/10 disabled:text-white/40 text-white p-2 rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0 w-9 h-9"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
