import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  FileText, 
  Bot, 
  User, 
  Link, 
  Copy, 
  Check, 
  Volume2, 
  Loader2, 
  Mic, 
  Square 
} from 'lucide-react';
import { speakText, transcribeSpeech } from '../api';

export default function ChatWindow({ 
  messages, 
  onSendMessage, 
  isLoading,
  activeDocument,
  onExport,
  globalSearch = false,
  setGlobalSearch
}) {
  const [input, setInput] = useState('');
  const [copiedIdx, setCopiedIdx] = useState(null);
  
  // TTS State
  const [ttsPlayingIdx, setTtsPlayingIdx] = useState(null);
  const [ttsLoadingIdx, setTtsLoadingIdx] = useState(null);
  
  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Auto-grow textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    onSendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSuggestionClick = (text) => {
    setInput(text);
    textareaRef.current?.focus();
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => {
      setCopiedIdx(null);
    }, 2000);
  };

  // Text-To-Speech integration
  const handleTTS = async (text, msgIdx) => {
    try {
      setTtsLoadingIdx(msgIdx);
      const audioBlob = await speakText(text);
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        setTtsPlayingIdx(null);
      };
      
      audio.play();
      setTtsPlayingIdx(msgIdx);
    } catch (err) {
      console.error("Text to speech play failed:", err);
    } finally {
      setTtsLoadingIdx(null);
    }
  };

  // Speech-To-Text mic audio recorder
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        try {
          setInput("Transcribing speech...");
          const data = await transcribeSpeech(audioBlob);
          setInput(data.text);
        } catch (err) {
          console.error("Voice transcription failed:", err);
          setInput("");
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access failed:", err);
      alert("Failed to access microphone. Verify permission settings.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const suggestions = [
    "What is the main summary of the document?",
    "List all key findings or metrics reported.",
    "Are there any actions or steps recommended?",
    "Summarize the conclusion section."
  ];

  return (
    <div className="flex-1 flex flex-col bg-[#0e0f13] h-full relative overflow-hidden font-sans select-none">
      
      {/* Active Context Ribbon */}
      <div className="w-full h-14 border-b border-white/5 bg-black/25 backdrop-blur-lg px-6 flex items-center justify-between text-xs text-gray-400 shrink-0 shadow-md">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 rounded bg-emerald-950/40 border border-emerald-500/20 flex items-center justify-center">
              <FileText className="w-3 h-3 text-emerald-400" />
            </div>
            <span className="font-semibold text-gray-400">Active Context:</span>
            <span className="font-bold text-gray-200 truncate max-w-[180px] md:max-w-xs" title={activeDocument ? activeDocument.name : ""}>
              {activeDocument ? activeDocument.name : "Multi-Document Vector Space (Global Search active)"}
            </span>
          </div>
          
          {/* Global Search Switch Toggle */}
          <div className="flex items-center space-x-2 bg-black/45 px-2.5 py-1 rounded-xl border border-white/5">
            <input 
              type="checkbox"
              id="global-search-toggle"
              checked={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.checked)}
              className="w-3.5 h-3.5 accent-emerald-500 cursor-pointer rounded-lg bg-[#333] border-gray-600 focus:ring-0 focus:ring-offset-0"
            />
            <label htmlFor="global-search-toggle" className="text-[9px] font-extrabold uppercase tracking-widest text-gray-400 cursor-pointer">
              Global Search
            </label>
          </div>
        </div>
        
        {/* Chat Export utilities */}
        {messages.length > 0 && onExport && (
          <div className="flex items-center space-x-2">
            <span className="text-[9px] text-gray-500 uppercase tracking-widest font-extrabold">Export:</span>
            <button 
              onClick={() => onExport('markdown')}
              className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/5 text-emerald-400 hover:text-white text-[10px] font-bold rounded-lg transition-all hover:scale-105 active:scale-95 shadow-sm"
            >
              MD
            </button>
            <button 
              onClick={() => onExport('docx')}
              className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/5 text-emerald-400 hover:text-white text-[10px] font-bold rounded-lg transition-all hover:scale-105 active:scale-95 shadow-sm"
            >
              DOCX
            </button>
            <button 
              onClick={() => onExport('pdf')}
              className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/5 text-emerald-400 hover:text-white text-[10px] font-bold rounded-lg transition-all hover:scale-105 active:scale-95 shadow-sm"
            >
              PDF
            </button>
          </div>
        )}
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto px-4 md:px-0 py-6 scroll-smooth select-none">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 ? (
            /* Empty State */
            <div className="h-full flex flex-col items-center justify-center text-center pt-12 md:pt-20 animate-fade-in select-none">
              <div className="w-14 h-14 bg-emerald-950/30 rounded-2xl flex items-center justify-center border border-emerald-500/20 mb-5 shadow-[0_0_24px_rgba(16,185,129,0.15)] animate-pulse">
                <Bot className="w-7 h-7 text-emerald-400" />
              </div>
              <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-400 mb-3 tracking-tight">
                Agentic Knowledge Platform
              </h2>
              <p className="text-sm text-gray-400 max-w-md mb-8 leading-relaxed">
                Ask anything. The agent automatically decides to scan your document chunks, execute real-time web searches, perform multi-doc comparisons, or consult GraphRAG models.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl px-4 select-none">
                {suggestions.map((sug, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(sug)}
                    className="p-4 rounded-2xl bg-[#13141c]/50 hover:bg-[#1a1b26]/70 border border-white/5 hover:border-emerald-500/20 text-left text-xs md:text-sm text-gray-300 hover:text-white shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 font-semibold"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              return (
                <div 
                  key={idx} 
                  className={`flex space-x-3.5 animate-fade-in ${
                    isUser ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {/* Left Bot Icon */}
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-emerald-950/40 border border-emerald-500/20 flex items-center justify-center shrink-0 shadow-md">
                      <Bot className="w-4 h-4 text-emerald-400" />
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 leading-relaxed text-sm md:text-base group relative transition-all duration-300 ${
                    isUser 
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-br-none shadow-[0_4px_16px_rgba(16,185,129,0.2)] border border-emerald-500/30' 
                      : 'bg-[#13141c] text-gray-200 rounded-bl-none border border-white/5 shadow-lg hover:border-white/10'
                  }`}>
                    {/* Render message body content */}
                    <div className="whitespace-pre-wrap select-text selection:bg-emerald-800 selection:text-white leading-relaxed text-xs md:text-sm">
                      {msg.content}
                    </div>

                    {/* Copy and Speech controls */}
                    {!isUser && (
                      <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 flex items-center space-x-1.5 transition-all duration-300">
                        <button
                          onClick={() => handleTTS(msg.content, idx)}
                          disabled={ttsLoadingIdx === idx}
                          className="p-1.5 rounded-lg bg-[#0e0f13]/80 hover:bg-black/60 border border-white/5 text-gray-400 hover:text-white transition-all focus:outline-none hover:scale-105 active:scale-95"
                          title="Speak Response"
                        >
                          {ttsLoadingIdx === idx ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                          ) : ttsPlayingIdx === idx ? (
                            <Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleCopy(msg.content, idx)}
                          className="p-1.5 rounded-lg bg-[#0e0f13]/80 hover:bg-black/60 border border-white/5 text-gray-400 hover:text-white transition-all focus:outline-none hover:scale-105 active:scale-95"
                          title="Copy Response"
                        >
                          {copiedIdx === idx ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    )}

                    {/* Reasoning Trace Explainability */}
                    {!isUser && msg.reasoning_trace && msg.reasoning_trace.length > 0 && (
                      <div className="mt-4 pt-2 border-t border-white/5 select-none">
                        <details className="outline-none group/details">
                          <summary className="text-[9px] uppercase font-bold text-gray-400 cursor-pointer list-none hover:text-emerald-400 flex items-center justify-between transition-colors">
                            <span>🔍 Reasoning Decision Trace ({msg.decision || 'Ingest Context'})</span>
                            <span className="text-[8px] text-gray-500 font-mono tracking-widest">CLICK TO EXPAND</span>
                          </summary>
                          <div className="mt-2 pl-3 border-l border-emerald-500/40 space-y-1.5 text-xs text-gray-400 font-mono select-text bg-black/30 p-3 rounded-xl max-h-48 overflow-y-auto shadow-inner leading-relaxed">
                            {msg.reasoning_trace.map((step, sIdx) => (
                              <div key={sIdx} className="leading-snug">
                                <span className="text-emerald-500/60 font-bold mr-1">&gt;</span> {step}
                              </div>
                            ))}
                          </div>
                        </details>
                      </div>
                    )}

                    {/* Confidence Meter */}
                    {!isUser && msg.confidence_score !== undefined && (
                      <div className="mt-3 text-[9px] text-gray-500 flex items-center justify-between select-none">
                        <span className="uppercase font-bold tracking-wider">Confidence Evaluation:</span>
                        <div className="flex items-center space-x-2 flex-1 max-w-[90px] ml-2 font-mono">
                          <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden border border-white/5">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                msg.confidence_score >= 0.8 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' :
                                msg.confidence_score >= 0.5 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' : 'bg-gradient-to-r from-rose-500 to-red-400'
                              }`}
                              style={{ width: `${msg.confidence_score * 100}%` }}
                            />
                          </div>
                          <span className="font-bold text-gray-400">{Math.round(msg.confidence_score * 100)}%</span>
                        </div>
                      </div>
                    )}

                    {/* Source Citations */}
                    {!isUser && msg.sources && msg.sources.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-white/5 flex flex-col space-y-2 select-none">
                        <span className="text-[9px] uppercase font-extrabold text-gray-400 tracking-widest flex items-center space-x-1.5">
                          <Link className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>Sources Cited ({msg.sources.length})</span>
                        </span>
                        <div className="flex flex-wrap gap-2 pt-0.5">
                          {msg.sources.map((src, sIdx) => (
                            <div 
                              key={sIdx} 
                              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#191a24] hover:bg-[#20222f] border border-white/5 text-[11px] text-emerald-400 transition-colors shadow-sm hover:scale-[1.02] active:scale-[0.98] duration-300 cursor-pointer"
                              title={`Chunk: ${src.chunk_id}`}
                            >
                              <FileText className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                              {src.page === 'Web' ? (
                                <a href={src.chunk_id} target="_blank" rel="noopener noreferrer" className="truncate max-w-[120px] font-bold text-gray-300 hover:underline">
                                  {src.file}
                                </a>
                              ) : (
                                <span className="truncate max-w-[120px] font-bold text-gray-300">{src.file}</span>
                              )}
                              <span className="text-[9px] text-emerald-400 font-extrabold bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
                                {src.page === 'Web' || src.page === '0' ? 'Web' : `Pg ${src.page}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right User Icon */}
                  {isUser && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 flex items-center justify-center shrink-0 shadow-md">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="flex space-x-3.5 justify-start">
              <div className="w-8 h-8 rounded-xl bg-emerald-950/40 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="bg-[#13141c] border border-white/5 rounded-2xl rounded-bl-none px-4 py-3 shadow-md flex items-center space-x-1.5 min-w-[70px]">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full typing-dot"></span>
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full typing-dot"></span>
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full typing-dot"></span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Box Area */}
      <div className="p-4 border-t border-white/5 bg-black/10 shrink-0">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative">
          <div className="relative rounded-2xl bg-[#13141c] border border-white/5 transition-all duration-300 focus-within:border-emerald-500/40 focus-within:shadow-[0_0_24px_rgba(16,185,129,0.08)] flex items-end shadow-lg">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isRecording ? "Listening to mic query..." : "Ask a question about the document context..."}
              disabled={isLoading || isRecording}
              className="flex-1 max-h-[200px] min-h-[44px] py-3.5 px-4 bg-transparent outline-none border-none text-sm md:text-base text-gray-200 placeholder-gray-600 resize-none font-sans"
            />
            <div className="p-2 flex items-center space-x-2 select-none">
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all focus:outline-none active:scale-95 ${
                  isRecording 
                    ? 'bg-rose-600 text-white animate-mic-pulse shadow-[0_0_12px_rgba(220,38,38,0.4)]' 
                    : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5'
                }`}
                title={isRecording ? "Stop Recording" : "Record Voice Query"}
              >
                {isRecording ? <Square className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>
              <button
                type="submit"
                disabled={!input.trim() || isLoading || isRecording}
                className="w-8 h-8 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:bg-gray-800 disabled:from-gray-800 disabled:to-gray-800 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 text-white flex items-center justify-center transition-all shadow-[0_2px_8px_rgba(16,185,129,0.15)] focus:outline-none hover:scale-105 active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <p className="text-[9px] text-center text-gray-500 mt-2 font-mono uppercase tracking-widest select-none">
            RAG Ingestion Routerdecides best routing automatically. Cites resources, sites, and logs confidence.
          </p>
        </form>
      </div>
    </div>
  );
}
