import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LuMessageCircle, LuX, LuSend, LuLoader } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { MarkdownView } from "./MarkdownView";
import { callGeminiAI } from "@/lib/aiClient";
import { cn } from "@/lib/utils";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

export function AIChatWidget({
  open,
  onOpenChange,
  initialAssistantMessage,
  context,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialAssistantMessage: string;
  context: string;
}) {
  const [messages, setMessages] = useState<Msg[]>(() => [
    { role: "assistant", content: initialAssistantMessage },
    { role: "assistant", content: "Is anything not clear? Ask me anything about this question." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const data = await callGeminiAI("chat", { messages: next, context });
      setMessages([...next, { role: "assistant", content: data.reply || "(no response)" }]);
    } catch (e: any) {
      setMessages([...next, { role: "assistant", content: `**Error:** ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-4 right-4 z-50 w-[min(420px,calc(100vw-2rem))] h-[min(600px,calc(100vh-2rem))] bg-card border-2 border-border rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        >
          <div className="flex items-center justify-between p-3 border-b border-border bg-primary text-primary-foreground">
            <div className="flex items-center gap-2 font-bold">
              <LuMessageCircle size={16} /> AI Tutor Chat
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="p-1 rounded-full hover:bg-white/20 transition"
              aria-label="Close chat"
            >
              <LuX size={16} />
            </button>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-2xl p-3 text-sm",
                  m.role === "user"
                    ? "bg-primary/10 border border-primary/30 ml-8"
                    : "bg-muted border border-border/40 mr-8",
                )}
              >
                <MarkdownView>{m.content}</MarkdownView>
              </div>
            ))}
            {loading && (
              <div className="bg-muted border border-border/40 mr-8 rounded-2xl p-3 text-sm text-muted-foreground inline-flex items-center gap-2">
                <LuLoader size={14} className="animate-spin" /> Thinking…
              </div>
            )}
          </div>
          <div className="p-3 border-t border-border flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask a follow-up…"
              className="flex-1 px-3 py-2 rounded-full border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              disabled={loading}
            />
            <Button
              onClick={send}
              disabled={loading || !input.trim()}
              size="icon"
              className="rounded-full"
            >
              <LuSend size={14} />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
