import React, { useState } from 'react';
import { 
  FileText, 
  Settings, 
  Sparkles, 
  CheckCircle, 
  Palette, 
  Trash2,
  Copy
} from 'lucide-react';

interface EmbedBuilderTabProps {
  onAddLog: (action: string, severity: 'low' | 'medium' | 'high') => void;
}

export default function EmbedBuilderTab({ onAddLog }: EmbedBuilderTabProps) {
  const [title, setTitle] = useState('🚨 Server Security Update');
  const [description, setDescription] = useState('Attention @everyone! Our AI automated security shield has updated to Level 3 anti-raid protection. New accounts younger than 3 days must verify via the CAPTCHA link.');
  const [color, setColor] = useState('#6366f1'); // Preset indigo
  const [author, setAuthor] = useState('Creative Workspace Security Desk');
  const [footer, setFooter] = useState('Ultimate Discord Bot - White Label Security System');
  const [image, setImage] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  const colors = [
    { value: '#6366f1', name: 'Indigo' },
    { value: '#10b981', name: 'Emerald' },
    { value: '#f59e0b', name: 'Amber' },
    { value: '#ef4444', name: 'Rose' },
    { value: '#a855f7', name: 'Purple' },
    { value: '#1e1b4b', name: 'Deep Space' }
  ];

  const handleCopyCode = () => {
    const jsonOutput = JSON.stringify({
      embeds: [{
        title,
        description,
        color: parseInt(color.replace('#', ''), 16),
        author: { name: author },
        footer: { text: footer },
        image: image ? { url: image } : undefined
      }]
    }, null, 2);

    navigator.clipboard.writeText(jsonOutput);
    setIsCopied(true);
    onAddLog('Exported custom Discord embed schema config to clipboard', 'low');
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="embed-builder-container">
      {/* Settings Input Form */}
      <div className="bg-[#121212] rounded-xl p-5 border border-zinc-800/80 space-y-4 shadow-xs" id="embed-inputs">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-1">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-indigo-500" />
            <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">Embed Design Controls</h3>
          </div>
          <button
            onClick={handleCopyCode}
            className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-100 text-indigo-400 text-xs font-black rounded-lg border border-indigo-200/40 flex items-center gap-1.5 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" /> {isCopied ? 'COPIED JSON!' : 'COPY CODE'}
          </button>
        </div>

        <div className="space-y-3.5">
          <div>
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Embed Color Accent</label>
            <div className="flex gap-2">
              {colors.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  style={{ backgroundColor: c.value }}
                  className={`w-8 h-8 rounded-lg transition-transform focus:outline-none relative border border-white/20 ${
                    color === c.value ? 'scale-110 shadow-md ring-2 ring-indigo-500/35' : 'hover:scale-105'
                  }`}
                  title={c.name}
                >
                  {color === c.value && (
                    <span className="absolute inset-0 m-auto w-1.5 h-1.5 rounded-full bg-[#121212]"></span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Embed Author Name</label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-full px-3.5 py-2 border border-zinc-800 bg-[#18181b] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              placeholder="e.g. Server Announcements Desk"
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Embed Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 border border-zinc-800 bg-[#18181b] rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              placeholder="Enter title text..."
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Embed Body Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-3.5 py-2 border border-zinc-800 bg-[#18181b] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 leading-normal resize-none"
              placeholder="Enter message body text..."
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Embed Image URL (Optional)</label>
            <input
              type="text"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              className="w-full px-3.5 py-2 border border-zinc-800 bg-[#18181b] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              placeholder="e.g. https://domain.com/image.png"
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block mb-1">Embed Footer Text</label>
            <input
              type="text"
              value={footer}
              onChange={(e) => setFooter(e.target.value)}
              className="w-full px-3.5 py-2 border border-zinc-800 bg-[#18181b] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              placeholder="e.g. Whitelabel Custom Branding"
            />
          </div>
        </div>
      </div>

      {/* Discord Live View Mockup */}
      <div className="bg-[#313338] rounded-xl p-6 text-zinc-100 flex flex-col justify-between shadow-md" id="embed-preview-pane">
        <div>
          {/* Mock Discord Channel Header */}
          <div className="flex items-center gap-2 border-b border-[#3f4147] pb-3 mb-4 text-[#dbdee1]">
            <span className="text-xl font-medium select-none text-[#80848e]">#</span>
            <span className="text-xs font-black">announcements</span>
            <span className="text-[10px] bg-[#3f4147] px-1.5 py-0.5 rounded text-[#b5bac1] font-bold">Channel</span>
          </div>

          {/* Bot Profile Card */}
          <div className="flex gap-4">
            {/* Bot Avatar */}
            <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-black text-sm select-none shrink-0">
              🤖
            </div>

            {/* Message Layout */}
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-bold text-[#f2f3f5] hover:underline cursor-pointer">Ultimate Bot</span>
                <span className="bg-[#5865f2] text-white text-[9px] font-bold px-1 py-0.25 rounded">BOT</span>
                <span className="text-[10px] text-[#949ba4] font-medium ml-1">Today at {new Date().toLocaleTimeString().slice(0, 5)}</span>
              </div>

              {/* Pixel Perfect Discord Embed Box */}
              <div 
                style={{ borderLeftColor: color }}
                className="bg-[#2b2d31] rounded border-l-[4px] p-4 max-w-lg space-y-2 relative overflow-hidden"
              >
                {author && (
                  <span className="text-[11px] font-bold text-[#f2f3f5] block hover:underline cursor-pointer">
                    {author}
                  </span>
                )}

                {title && (
                  <h4 className="text-xs font-bold text-white hover:underline cursor-pointer">
                    {title}
                  </h4>
                )}

                {description && (
                  <p className="text-[11px] text-[#dbdee1] leading-normal font-sans whitespace-pre-wrap">
                    {description}
                  </p>
                )}

                {image && (
                  <div className="rounded-lg overflow-hidden border border-[#3f4147] max-h-48 mt-2">
                    <img 
                      src={image} 
                      alt="Embed Attachment" 
                      className="object-cover w-full h-full"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {footer && (
                  <span className="text-[9px] text-[#949ba4] font-bold tracking-tight block">
                    {footer}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-[#3f4147] text-[10px] text-[#949ba4] flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#23a55a]"></span> Active Guild Preview Mode. Matches standard desktop layout.
        </div>
      </div>
    </div>
  );
}
