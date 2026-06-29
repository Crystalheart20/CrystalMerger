import React, { useState } from "react";
import { Sparkles, Send, Loader2, ListOrdered, Check, AlertCircle, FileText, ArrowRight } from "lucide-react";
import { CollatedFile, ChatMessage } from "../types";

interface AIAssistantProps {
  files: CollatedFile[];
  onApplySuggestedOrder: (suggestedIndexMapping: { originalIndex: number; newIndex: number }[]) => void;
  onSetAutoSummary: (summary: string) => void;
  activeSummary: string;
}

export function AIAssistant({
  files,
  onApplySuggestedOrder,
  onSetAutoSummary,
  activeSummary,
}: AIAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isChatting, setIsChatting] = useState(false);
  const [orderSuggestions, setOrderSuggestions] = useState<any[]>([]);

  // 1. Generate Executive Summary
  const handleGenerateSummary = async () => {
    if (files.length === 0) return;
    setIsSummarizing(true);

    try {
      // Package file texts for summarization (limit length to prevent overflowing limits)
      const payloadFiles = files.map((f) => ({
        name: f.name,
        type: f.type,
        text: (f.text || "").slice(0, 8000),
      }));

      const res = await fetch("/api/gemini/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: payloadFiles }),
      });

      const data = await res.json();
      if (data.summary) {
        onSetAutoSummary(data.summary);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSummarizing(false);
    }
  };

  // 2. Suggest optimal ordering index
  const handleSuggestOrder = async () => {
    if (files.length === 0) return;
    setIsSuggesting(true);

    try {
      const payloadFiles = files.map((f) => ({
        name: f.name,
        type: f.type,
        text: (f.text || "").slice(0, 1000), // metadata and brief introduction
      }));

      const res = await fetch("/api/gemini/suggest-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: payloadFiles }),
      });

      const data = await res.json();
      if (data.suggestions && Array.isArray(data.suggestions)) {
        setOrderSuggestions(data.suggestions);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSuggesting(false);
    }
  };

  const applySuggestions = () => {
    if (orderSuggestions.length === 0) return;
    
    // Create index coordinates mapping: target originalIndex -> target suggestion array index
    const mapping = orderSuggestions.map((s, idx) => ({
      originalIndex: s.originalIndex,
      newIndex: idx,
    }));
    
    onApplySuggestedOrder(mapping);
    setOrderSuggestions([]); // clear suggestions
  };

  // 3. Conversational chatbot
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const safeId = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 11) + "_" + Date.now().toString(36);

    const userMessage: ChatMessage = {
      id: safeId,
      role: "user",
      content: inputText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText("");
    setIsChatting(true);

    try {
      // Pack full document context text
      const payloadFiles = files.map((f) => ({
        name: f.name,
        text: (f.text || "").slice(0, 6000),
      }));

      const payloadMessages = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: payloadMessages,
          files: payloadFiles,
        }),
      });

      const data = await res.json();
      if (data.reply) {
        const modelSafeId = typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).substring(2, 11) + "_" + Date.now().toString(36);

        setMessages((prev) => [
          ...prev,
          {
            id: modelSafeId,
            role: "assistant",
            content: data.reply,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsChatting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-100 flex flex-col h-full overflow-hidden min-h-[460px]">
      {/* Header Banner */}
      <div className="px-5 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400" />
          <h3 className="font-semibold text-white text-sm">Gemini AI Assistant</h3>
        </div>
        <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded tracking-wide">
          gemini-3.5-flash
        </span>
      </div>

      {/* Tabs / Accordions */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[500px]">
        {/* EXECUTIVE SUMMARIZER ACCORDION */}
        <div className="p-5">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Automated Executive Summary</h4>
          <p className="text-xs text-slate-400 mb-3 leading-relaxed">
            Let Gemini study all parsed documents (Word reports, Excel tabs, PDFs, etc.) and write a consolidated Executive Summary block right after the cover page.
          </p>
          
          {activeSummary ? (
            <div className="space-y-3">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-150 text-xs text-slate-705 leading-relaxed font-sans max-h-40 overflow-y-auto whitespace-pre-wrap">
                {activeSummary}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  id="btn-regen-summary"
                  onClick={handleGenerateSummary}
                  disabled={isSummarizing || files.length === 0}
                  className="flex-1 max-w-[120px] text-[10px] font-semibold text-slate-600 bg-slate-100 py-2 rounded-lg hover:bg-slate-200 transition-all"
                >
                  Regenerate
                </button>
                <div className="bg-emerald-50 text-emerald-805 text-[10px] font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 flex-1 border border-emerald-100">
                  <Check className="w-3.5 h-3.5" />
                  <span>Configured to merge at Page 2</span>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              id="btn-gen-exec-summary"
              disabled={isSummarizing || files.length === 0}
              onClick={handleGenerateSummary}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm border border-indigo-500"
            >
              {isSummarizing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Analyzing document corpus...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate AI summary section</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* SEQUENCE OPTIMIZER ACCORDION */}
        <div className="p-5">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Smart Sequence Organizer</h4>
          <p className="text-xs text-slate-400 mb-3 leading-relaxed">
            Provides a strategic order mapping suggestion (e.g. putting agendas/plans first, sheets mid-way, drawings at appendices).
          </p>

          {orderSuggestions.length > 0 ? (
            <div className="space-y-3">
              <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 text-xs text-blue-750 flex gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Gemini suggested an optimal sequence from the text excerpts. Click apply to automatically re-order files in your list.</span>
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto bg-slate-50 p-3.5 rounded-xl border border-slate-150">
                {orderSuggestions.map((s, idx) => (
                  <div key={idx} className="flex gap-2 items-start text-[11px] leading-relaxed">
                    <span className="font-bold text-indigo-650 bg-indigo-50 px-1.5 rounded shrink-0">{idx + 1}</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-700 truncate">{s.name}</p>
                      <p className="text-slate-400 text-[10px]">Title: {s.sectionTitle} • {s.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  id="btn-apply-order"
                  onClick={applySuggestions}
                  className="flex-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-750 py-2.5 rounded-xl"
                >
                  Apply Suggested Sequence
                </button>
                <button
                  type="button"
                  id="btn-cancel-order"
                  onClick={() => setOrderSuggestions([])}
                  className="text-xs font-semibold text-slate-600 bg-slate-100 py-2.5 px-4 rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              id="btn-suggest-collate"
              onClick={handleSuggestOrder}
              disabled={isSuggesting || files.length === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
            >
              {isSuggesting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Calculating flow structure...</span>
                </>
              ) : (
                <>
                  <ListOrdered className="w-3.5 h-3.5" />
                  <span>Analyze smart merge sequence</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* COHESIVE FILE CHAT/Q&A PANEL */}
        <div className="p-5 flex flex-col">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Cross-Document Q&A Chat</h4>
          <p className="text-xs text-slate-400 mb-3 leading-relaxed">
            Query across the extracted parameters of your files instantly. E.g. "Draft an introduction tying these reports together".
          </p>

          <div className="h-56 border border-slate-150 rounded-xl bg-slate-50 p-4 overflow-y-auto mb-3 flex flex-col gap-3">
            {messages.length === 0 ? (
              <div className="m-auto text-center max-w-xs text-[11px] text-slate-400">
                <Sparkles className="w-5 h-5 text-indigo-400 inline mb-2" />
                <p>Chat is initialized! Ask anything about budgets, numbers, words, or files currently loaded.</p>
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                      m.role === "user"
                        ? "bg-indigo-600 text-white rounded-tr-none"
                        : "bg-white text-slate-700 border border-slate-150 rounded-tl-none shadow-2xs"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  </div>
                  <span className="text-[9px] text-slate-400 mt-1 px-1">{m.timestamp}</span>
                </div>
              ))
            )}
            {isChatting && (
              <div className="flex items-center gap-2 text-slate-400 text-xs">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Gemini is synthesizing...</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              id="gemini-assistant-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={files.length === 0 ? "Upload files to ask questions..." : "Ask questions across materials..."}
              disabled={files.length === 0}
              className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-blue-500 text-slate-700 bg-white"
            />
            <button
              type="submit"
              id="gemini-assistant-submit"
              disabled={files.length === 0 || !inputText.trim()}
              className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
