import React, { useState } from 'react';
import { 
  Sparkles, 
  Bot, 
  Send, 
  HelpCircle, 
  MessageSquare,
  Flame,
  Globe,
  FileText,
  AlertOctagon,
  CornerDownLeft
} from 'lucide-react';

interface Message {
  sender: 'user' | 'assistant';
  text: string;
  sources?: Array<{ title: string; uri: string }>;
  isError?: boolean;
}

interface AiSystemTabProps {
  messages: Message[];
  isGenerating: boolean;
  onSendMessage: (text: string) => Promise<void>;
}

export default function AiSystemTab({ messages, isGenerating, onSendMessage }: AiSystemTabProps) {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;
    
    const textToSend = prompt.trim();
    setPrompt('');
    await onSendMessage(textToSend);
  };

  const handleApplyTemplate = (cmd: string) => {
    setPrompt(cmd);
  };

  // Safe formatting helper to render bold tags **text** and lists
  const formatMessage = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      if (!line.trim()) return <div key={idx} className="h-2"></div>;

      if (line.trim().startsWith('###')) {
        return <h4 key={idx} className="text-sm font-bold text-indigo-900 mt-2 mb-1">{line.replace('###', '').trim()}</h4>;
      }

      const boldRegex = /\*\*(.*?)\*\*/g;
      const parts: React.ReactNode[] = [];
      let lastIndex = 0;
      let match;
      
      while ((match = boldRegex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          parts.push(line.slice(lastIndex, match.index));
        }
        parts.push(
          <strong key={match.index} className="font-bold text-zinc-950">
            {match[1]}
          </strong>
        );
        lastIndex = boldRegex.lastIndex;
      }
      
      if (lastIndex < line.length) {
        parts.push(line.slice(lastIndex));
      }

      const content = parts.length > 0 ? parts : line;

      if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
        const cleaned = line.trim().substring(1).trim();
        return (
          <p key={idx} className="pl-4 list-item list-disc ml-4 text-zinc-700 my-0.5 leading-relaxed">
            {cleaned}
          </p>
        );
      }

      return (
        <p key={idx} className="text-zinc-700 my-0.5 leading-relaxed">
          {content}
        </p>
      );
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6" id="ai-system-tab-container">
      
      {/* Bot Slash Command Config and Templates */}
      <div className="lg:col-span-1 space-y-4" id="ai-command-list">
        <div className="bg-[#121212] rounded-xl p-5 border border-zinc-800/80 space-y-4 shadow-xs">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-indigo-600" />
            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-wider">AI Slash Commands</h3>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Use the command templates below to invoke the AI Assistant:
          </p>

          <div className="flex flex-col gap-2">
            {[
              { cmd: '[MODE: RAID_DREAM] INPUT: 7 din er log: mass channel delete attempt by unknown admin. KAJ: Raid risk % + suspects + action.', label: '⚡ RAID_DREAM', desc: 'Predict raid risk & 3 suspects.' },
              { cmd: '[MODE: CODE_DOCTOR] INPUT: Error: TypeError: cannot read properties of null. Code: bot.on("message", null)', label: '🩺 CODE_DOCTOR', desc: 'Find bug + 1 line fix in Bangla.' },
              { cmd: '[MODE: VC_GOD] INPUT: Transcript: "Kire khankir pola bhalo hbi na" User: 1211700196459675658', label: '🎙️ VC_GOD', desc: 'Voice/Text Gali & Scam auditor.' },
              { cmd: '[MODE: SALES_CLOSER] INPUT: Customer: "Bhai bot er dam koto ar feature ki?" Product: $14.99/mo Anti-Nuke', label: '💰 SALES_CLOSER', desc: '2-line soft sales closer.' },
              { cmd: '[MODE: VIRAL_CONTENT] INPUT: Topic: Gaming & Anti-Nuke Security', label: '🔥 VIRAL_CONTENT', desc: '1 Poll + 1 Meme + 1 Event idea.' },
              { cmd: '[MODE: AI_JUDGE] INPUT: Report: User X nuked channels Evidence: Audit logs deleted 5 channels', label: '⚖️ AI_JUDGE', desc: 'Judge guilty user + punishment.' },
              { cmd: '/ask How to setup 100/100 Zero Trust protection on EXCLUSIVE server?', label: '🗣️ /ask', desc: 'Ask anything to God AI Brain.' },
            ].map((btn, idx) => (
              <button
                key={idx}
                onClick={() => handleApplyTemplate(btn.cmd)}
                className="text-left p-2 bg-[#18181b] hover:bg-indigo-500/10 border border-zinc-800 hover:border-indigo-500/40 rounded-lg transition-all group"
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-indigo-400 group-hover:text-indigo-300 font-mono">{btn.label}</span>
                  <CornerDownLeft className="w-3 h-3 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-[10px] text-zinc-500 mt-0.5">{btn.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-amber-50/60 rounded-xl p-5 border border-amber-200/50" id="ai-auto-moderation-note">
          <div className="flex gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-xs text-amber-800 leading-relaxed">
              <strong>AI Auto Mod Enabled:</strong> 
              <span className="block mt-1">
                The AI system automatically scans all incoming channel messages for fraud, high toxicity, and spam pattern analysis in the background.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Interactive AI Sandbox */}
      <div className="lg:col-span-3 bg-[#121212] rounded-xl p-5 border border-zinc-800/80 flex flex-col justify-between min-h-[500px] shadow-xs" id="chat-sandbox">
        <div>
          <div className="flex items-center justify-between border-b border-zinc-100 pb-4 mb-4">
            <div>
              <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">Discord Interactive AI Chat Sandbox</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Test real-time interactive slash command replies powered by Gemini 3.6 Flash.</p>
            </div>
            <span className="text-[10px] font-bold bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-200/50">
              Active Session
            </span>
          </div>

          {/* Interactive Chat Window */}
          <div className="bg-[#18181b] rounded-xl p-4 border border-zinc-800 overflow-y-auto space-y-4 max-h-[350px] min-h-[320px]" id="chat-stream">
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`flex flex-col max-w-[85%] ${msg.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
              >
                <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                  msg.sender === 'user' 
                    ? 'bg-indigo-600 text-white rounded-br-none shadow-xs' 
                    : msg.isError
                      ? 'bg-rose-500/10 text-rose-800 border border-rose-200 rounded-bl-none shadow-xs'
                      : 'bg-[#121212] text-zinc-200 border border-zinc-800 rounded-bl-none shadow-xs'
                }`}>
                  {msg.sender === 'user' ? msg.text : formatMessage(msg.text)}

                  {/* Rendering search sources if available */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-zinc-100 flex flex-col gap-1.5 w-full">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Google Search Grounding:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.sources.map((src, sIdx) => (
                          <a
                            key={sIdx}
                            href={src.uri}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] font-semibold bg-[#27272a] hover:bg-indigo-500/10 hover:text-indigo-800 text-zinc-400 px-2 py-1 rounded-md border border-zinc-800 transition-all inline-flex items-center gap-1"
                          >
                            🔍 {src.title.length > 25 ? src.title.slice(0, 25) + "..." : src.title}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-zinc-400 mt-1 font-bold px-1 uppercase tracking-wider">
                  {msg.sender === 'user' ? 'You' : 'Ultimate Bot (AI System)'}
                </span>
              </div>
            ))}

            {isGenerating && (
              <div className="flex flex-col max-w-[85%] mr-auto items-start animate-pulse">
                <div className="p-3 bg-[#121212] text-zinc-500 border border-zinc-800 rounded-2xl rounded-bl-none text-xs flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  <span className="text-[11px] text-zinc-400 font-bold">Scanning with Gemini Live & Google Search Grounding...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action input form */}
        <form onSubmit={handleSubmit} className="flex gap-2 mt-4" id="ai-chat-input-form">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isGenerating}
            placeholder={isGenerating ? "Analyzing message..." : "Type custom request or click a command from the left..."}
            className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-800 bg-[#18181b] text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={isGenerating || !prompt.trim()}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-200 text-white rounded-xl text-xs font-black tracking-wider uppercase flex items-center gap-1.5 transition-all disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" /> {isGenerating ? "WAIT" : "SEND"}
          </button>
        </form>

      </div>

    </div>
  );
}
