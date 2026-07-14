import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Square,
  RotateCcw
} from 'lucide-react';
import { speakText } from '../api';
import { TypingIndicator } from './ui/Loader';
import Button from './ui/Button';
import Card from './ui/Card';

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
  const recognitionRef = useRef(null);

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
    if (e) e.preventDefault();
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
    onSendMessage(text);
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

  // Speech-To-Text mic audio recognition using browser native SpeechRecognition API
  const startRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Try Chrome or Safari.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
        setInput("Listening...");
      };

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');
        setInput(transcript);
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        if (event.error !== 'no-speech') {
          setIsRecording(false);
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
    } catch (err) {
      console.error("Speech recognition initialization failed:", err);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleRegenerate = () => {
    const userMessages = messages.filter(m => m.role === 'user');
    if (userMessages.length === 0) return;
    const lastUserMsg = userMessages[userMessages.length - 1];
    onSendMessage(lastUserMsg.content);
  };

  const exampleCards = [
    { label: "📄 Summarize document", prompt: "What is the main summary of the document context?" },
    { label: "📝 Generate MCQs", prompt: "Can you generate multiple choice questions for the current context?" },
    { label: "🎓 Viva Questions", prompt: "Give me some revision viva prep questions from the context." },
    { label: "📚 Revision Notes", prompt: "Compile comprehensive Revision Sheets from the document." },
    { label: "🌐 Latest AI News", prompt: "What are the latest AI news and trends in current events?" },
    { label: "💼 Interview Questions", prompt: "Generate standard interview Q&A cards from the context." }
  ];

  const username = localStorage.getItem('rag_username') || "Viswateja";

  const getThinkingState = (msg) => {
    if (!msg) return "Thinking...";
    if (msg.decision === "web" || msg.decision === "hybrid") return "Searching the web...";
    if (!msg.reasoning_trace || msg.reasoning_trace.length === 0) return "Thinking...";
    const lastStep = msg.reasoning_trace[msg.reasoning_trace.length - 1].toLowerCase();
    if (lastStep.includes("router")) return "Thinking...";
    if (lastStep.includes("retrieval") || lastStep.includes("retriever") || lastStep.includes("vector")) return "Searching documents...";
    if (lastStep.includes("web_search") || lastStep.includes("web search") || lastStep.includes("google") || lastStep.includes("tavily")) return "Searching the web...";
    if (lastStep.includes("synthesis") || lastStep.includes("synthesizer") || lastStep.includes("complete")) return "Generating answer...";
    return "Thinking...";
  };

  const parseInline = (text) => {
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={idx} className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-cyan-500 dark:from-indigo-400 dark:to-cyan-400">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={idx} className="italic text-slate-500 dark:text-gray-400">{part.slice(1, -1)}</em>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={idx} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-black/40 text-indigo-600 dark:text-cyan-300 font-mono text-xs">{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  const renderMarkdown = (text) => {
    if (!text) return null;
    const blocks = text.split(/(```[\s\S]*?```)/g);
    
    return blocks.map((block, idx) => {
      if (block.startsWith('```')) {
        const match = block.match(/```(\w*)\n([\s\S]*?)```/);
        const language = match ? match[1] : '';
        const code = match ? match[2] : block.slice(3, -3);
        
        return (
          <div key={idx} className="my-3 rounded-xl bg-slate-950 border border-slate-200 dark:border-white/10 overflow-hidden font-mono text-xs select-text shadow-inner">
            <div className="flex justify-between items-center px-4 py-1.5 bg-slate-100 dark:bg-black/40 text-slate-500 dark:text-slate-400 select-none border-b border-slate-200 dark:border-white/5">
              <span className="uppercase text-[9px] font-extrabold tracking-wider">{language || 'code'}</span>
              <button 
                onClick={() => navigator.clipboard.writeText(code)}
                className="text-[9px] font-extrabold hover:text-[#6366F1] dark:hover:text-white transition-colors"
              >
                Copy
              </button>
            </div>
            <pre className="p-4 overflow-auto max-h-96 scrollbar-thin text-[#06B6D4] dark:text-cyan-300">
              <code>{code}</code>
            </pre>
          </div>
        );
      }
      
      const lines = block.split('\n');
      const renderedLines = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.startsWith('|') && i + 1 < lines.length && lines[i+1].includes('|-')) {
          const tableLines = [];
          let j = i;
          while (j < lines.length && lines[j].startsWith('|')) {
            tableLines.push(lines[j]);
            j++;
          }
          i = j - 1;
          
          const headers = tableLines[0].split('|').map(s => s.trim()).filter(Boolean);
          const rows = tableLines.slice(2).map(row => row.split('|').map(s => s.trim()).filter(Boolean));
          
          renderedLines.push(
            <div key={i} className="my-3 overflow-x-auto border border-slate-200 dark:border-white/5 rounded-xl">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-white/10">
                <thead className="bg-slate-100 dark:bg-black/20">
                  <tr>
                    {headers.map((h, hIdx) => (
                      <th key={hIdx} className="px-4 py-2 text-left text-xs font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
                  {rows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-4 py-2 text-slate-700 dark:text-gray-300 font-medium">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
          continue;
        }
        
        if (line.startsWith('### ')) {
          renderedLines.push(<h3 key={i} className="text-sm font-extrabold text-slate-800 dark:text-white mt-4 mb-2">{parseInline(line.slice(4))}</h3>);
          continue;
        }
        if (line.startsWith('## ')) {
          renderedLines.push(<h2 key={i} className="text-base font-extrabold text-slate-800 dark:text-white mt-4 mb-2 border-b border-slate-200 dark:border-white/5 pb-1">{parseInline(line.slice(3))}</h2>);
          continue;
        }
        if (line.startsWith('# ')) {
          renderedLines.push(<h1 key={i} className="text-lg font-extrabold text-slate-850 dark:text-white mt-5 mb-2">{parseInline(line.slice(2))}</h1>);
          continue;
        }
        
        if (line.startsWith('- ') || line.startsWith('* ')) {
          renderedLines.push(
            <li key={i} className="list-disc ml-5 mb-1 text-xs md:text-sm text-slate-750 dark:text-gray-300 leading-relaxed font-medium">
              {parseInline(line.slice(2))}
            </li>
          );
          continue;
        }
        
        const numMatch = line.match(/^(\d+)\.\s(.*)/);
        if (numMatch) {
          renderedLines.push(
            <li key={i} className="list-decimal ml-5 mb-1 text-xs md:text-sm text-slate-755 dark:text-gray-300 leading-relaxed font-medium">
              {parseInline(numMatch[2])}
            </li>
          );
          continue;
        }
        
        if (line.trim().length > 0) {
          renderedLines.push(<p key={i} className="mb-2 leading-relaxed text-xs md:text-sm text-slate-700 dark:text-gray-300 font-medium">{parseInline(line)}</p>);
        } else {
          renderedLines.push(<div key={i} className="h-2" />);
        }
      }
      
      return <div key={idx}>{renderedLines}</div>;
    });
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F8FAFC] dark:bg-[#0F172A] h-full relative overflow-hidden font-sans select-none transition-colors duration-300">
      
      {/* Active Context Ribbon */}
      <div className="w-full h-14 border-b border-slate-200 dark:border-white/5 bg-slate-100/50 dark:bg-black/25 backdrop-blur-lg px-6 flex items-center justify-between text-xs text-slate-600 dark:text-gray-400 shrink-0 shadow-sm z-10">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 rounded bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-inner">
              <FileText className="w-3 h-3 text-indigo-400" />
            </div>
            <span className="font-semibold">Active Context:</span>
            <span className="font-bold text-slate-800 dark:text-gray-200 truncate max-w-[180px] md:max-w-xs" title={activeDocument ? activeDocument.name : ""}>
              {activeDocument ? activeDocument.name : "Multi-Document Vector Space (Global Search active)"}
            </span>
          </div>
          
          {/* Global Search Switch Toggle */}
          <div className="flex items-center space-x-2 bg-slate-200/50 dark:bg-black/30 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-white/5 shadow-inner">
            <input 
              type="checkbox"
              id="global-search-toggle"
              checked={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.checked)}
              className="w-3.5 h-3.5 accent-indigo-500 cursor-pointer rounded-lg bg-[#333] border-gray-600 focus:ring-0 focus:ring-offset-0"
            />
            <label htmlFor="global-search-toggle" className="text-[9px] font-extrabold uppercase tracking-widest text-slate-600 dark:text-gray-400 cursor-pointer select-none">
              Global Search
            </label>
          </div>
        </div>
        
        {/* Chat Export utilities */}
        {messages.length > 0 && onExport && (
          <div className="flex items-center space-x-2">
            <span className="text-[9px] text-slate-400 dark:text-gray-500 uppercase tracking-widest font-extrabold">Export:</span>
            <button 
              onClick={() => onExport('markdown')}
              className="px-2.5 py-1 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/5 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded-lg transition-all hover:scale-105 active:scale-95 shadow-sm"
            >
              MD
            </button>
            <button 
              onClick={() => onExport('docx')}
              className="px-2.5 py-1 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/5 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded-lg transition-all hover:scale-105 active:scale-95 shadow-sm"
            >
              DOCX
            </button>
            <button 
              onClick={() => onExport('pdf')}
              className="px-2.5 py-1 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/5 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded-lg transition-all hover:scale-105 active:scale-95 shadow-sm"
            >
              PDF
            </button>
          </div>
        )}
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 md:px-0 py-6 scroll-smooth select-none">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 ? (
            /* Empty State */
            <div className="h-full flex flex-col items-center justify-center text-center pt-8 md:pt-16 animate-fade-in select-none">
              <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20 mb-4 shadow-md">
                <Bot className="w-7 h-7 text-[#6366F1]" />
              </div>
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-gray-100 mb-2 tracking-tight">
                Hi {username}! 👋
              </h2>
              <p className="text-sm text-slate-500 dark:text-gray-400 max-w-md mb-8 leading-relaxed font-semibold">
                How can I help you today? Ingest PDFs to chat with your knowledge base, trigger web searches, or study concepts.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl px-4 select-none">
                {exampleCards.map((card, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(card.prompt)}
                    className="p-4 rounded-2xl bg-white dark:bg-[#1E293B] hover:bg-indigo-50/50 dark:hover:bg-indigo-500/5 border border-slate-200 dark:border-white/5 hover:border-indigo-500/20 dark:hover:border-indigo-500/30 text-left text-xs md:text-sm text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 font-semibold"
                  >
                    {card.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((msg, idx) => {
                const isUser = msg.role === 'user';
                const isLastMsg = idx === messages.length - 1;
                
                return (
                  <motion.div 
                    key={idx} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex space-x-3.5 ${
                      isUser ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {!isUser && (
                      <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 shadow-sm">
                        <Bot className="w-4 h-4 text-[#6366F1]" />
                      </div>
                    )}

                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 leading-relaxed text-sm md:text-base group relative transition-all duration-300 ${
                      isUser 
                        ? 'bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white rounded-br-none shadow-md border border-indigo-500/20' 
                        : 'bg-white dark:bg-[#1E293B] text-slate-800 dark:text-gray-200 rounded-bl-none border border-slate-200 dark:border-white/5 shadow-md hover:border-indigo-500/10 dark:hover:border-indigo-500/15'
                    }`}>
                      {/* Source Badge */}
                      {!isUser && msg.decision && (
                        <div className="mb-2 inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-black/20 border border-slate-200/60 dark:border-white/5 text-[9px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 select-none">
                          {msg.decision === 'rag' && <span>📄 Document</span>}
                          {msg.decision === 'web' && <span>🌐 Web Search</span>}
                          {msg.decision === 'llm' && <span>🤖 AI Knowledge</span>}
                          {msg.decision === 'hybrid' && <span>📄🌐 Hybrid Context</span>}
                        </div>
                      )}
                      
                      {/* Render message body content with Markdown */}
                      <div className="select-text selection:bg-indigo-800 selection:text-white font-medium text-xs md:text-sm">
                        {isUser ? msg.content : renderMarkdown(msg.content)}
                      </div>

                      {/* Copy and Speech controls */}
                      {!isUser && msg.content && (
                        <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 flex items-center space-x-1.5 transition-all duration-300 bg-white/80 dark:bg-[#1E293B]/80 p-0.5 rounded-lg border border-slate-200 dark:border-white/5 backdrop-blur-sm shadow-sm select-none z-10">
                          <button
                            onClick={() => handleTTS(msg.content, idx)}
                            disabled={ttsLoadingIdx === idx}
                            className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-black/15 text-slate-650 dark:text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-all focus:outline-none hover:scale-105 active:scale-95"
                            title="Speak Response"
                          >
                            {ttsLoadingIdx === idx ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                            ) : ttsPlayingIdx === idx ? (
                              <Volume2 className="w-3.5 h-3.5 text-indigo-450 dark:text-indigo-400 animate-pulse" />
                            ) : (
                              <Volume2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleCopy(msg.content, idx)}
                            className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-black/15 text-slate-650 dark:text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-all focus:outline-none hover:scale-105 active:scale-95"
                            title="Copy Response"
                          >
                            {copiedIdx === idx ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          {isLastMsg && (
                            <button
                              onClick={handleRegenerate}
                              className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-black/15 text-slate-655 dark:text-gray-400 hover:text-indigo-505 dark:hover:text-indigo-404 transition-all focus:outline-none hover:scale-105 active:scale-95"
                              title="Regenerate Response"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}

                      {/* Reasoning Trace Explainability */}
                      {!isUser && msg.reasoning_trace && msg.reasoning_trace.length > 0 && (
                        <div className="mt-4 pt-2 border-t border-slate-100 dark:border-white/5 select-none">
                          <details className="outline-none group/details">
                            <summary className="text-[9px] uppercase font-bold text-slate-500 dark:text-gray-400 cursor-pointer list-none hover:text-indigo-400 flex items-center justify-between transition-colors">
                              <span>🔍 Reasoning Decision Trace ({msg.decision || 'Ingest Context'})</span>
                              <span className="text-[8px] text-slate-400 dark:text-gray-550 font-mono tracking-widest">CLICK TO EXPAND</span>
                            </summary>
                            <div className="mt-2 pl-3 border-l border-indigo-500/40 space-y-1 text-xs text-slate-550 dark:text-gray-400 font-mono select-text bg-slate-50 dark:bg-black/20 p-2.5 rounded-xl max-h-40 overflow-y-auto shadow-inner leading-relaxed">
                              {msg.reasoning_trace.map((step, sIdx) => (
                                <div key={sIdx} className="leading-snug">
                                  <span className="text-indigo-500/60 font-bold mr-1">&gt;</span> {step}
                                </div>
                              ))}
                            </div>
                          </details>
                        </div>
                      )}

                      {/* Confidence Meter */}
                      {!isUser && msg.confidence_score !== undefined && (
                        <div className="mt-3 text-[9px] text-slate-400 dark:text-gray-500 flex items-center justify-between select-none">
                          <span className="uppercase font-bold tracking-wider">Confidence Evaluation:</span>
                          <div className="flex items-center space-x-2 flex-1 max-w-[90px] ml-2 font-mono">
                            <div className="w-full bg-slate-200 dark:bg-black/40 h-1 rounded-full overflow-hidden border border-slate-200 dark:border-white/5">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                  msg.confidence_score >= 0.8 ? 'bg-[#06B6D4]' :
                                  msg.confidence_score >= 0.5 ? 'bg-amber-500' : 'bg-rose-500'
                                }`}
                                style={{ width: `${msg.confidence_score * 100}%` }}
                              />
                            </div>
                            <span className="font-bold text-slate-600 dark:text-gray-450">{Math.round(msg.confidence_score * 100)}%</span>
                          </div>
                        </div>
                      )}

                      {/* Source Citations */}
                      {!isUser && msg.sources && msg.sources.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex flex-col space-y-2 select-none">
                          <span className="text-[9px] uppercase font-extrabold text-slate-400 dark:text-gray-500 tracking-widest flex items-center space-x-1.5">
                            <Link className="w-3 h-3 text-[#6366F1] shrink-0" />
                            <span>Sources Cited ({msg.sources.length})</span>
                          </span>
                          <div className="flex flex-wrap gap-2 pt-0.5">
                            {msg.sources.map((src, sIdx) => (
                              <div 
                                key={sIdx} 
                                className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-slate-105 dark:bg-black/15 border border-slate-200 dark:border-white/5 text-[10px] text-[#6366F1] transition-colors shadow-sm hover:scale-[1.01] active:scale-[0.99] duration-300 cursor-pointer"
                                title={`Chunk: ${src.chunk_id}`}
                              >
                                <FileText className="w-3 h-3 shrink-0 text-indigo-500" />
                                {src.page === 'Web' ? (
                                  <a href={src.chunk_id} target="_blank" rel="noopener noreferrer" className="truncate max-w-[120px] font-bold text-slate-700 dark:text-gray-300 hover:underline">
                                    {src.file}
                                  </a>
                                ) : (
                                  <span className="truncate max-w-[120px] font-bold text-slate-750 dark:text-gray-300">{src.file}</span>
                                )}
                                <span className="text-[8px] text-[#6366F1] font-extrabold bg-indigo-500/10 border border-[#6366F1]/20 px-1.5 py-0.2 rounded-lg">
                                  {src.page === 'Web' || src.page === '0' ? 'Web' : `Pg ${src.page}`}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {isUser && (
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] flex items-center justify-center shrink-0 shadow-sm">
                        <User className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}

          {/* Dynamic Ingestion / Synthesis Loading Indicator */}
          {isLoading && (
            <div className="flex space-x-3.5 justify-start animate-pulse">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-[#6366F1]" />
              </div>
              <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-white/5 rounded-2xl rounded-bl-none px-4 py-3 shadow-md flex flex-col space-y-2">
                <div className="flex items-center space-x-2">
                  <TypingIndicator />
                  <span className="text-[9px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-widest font-mono pl-1">
                    {getThinkingState(messages[messages.length - 1])}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Box Area */}
      <div className="p-4 border-t border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-black/10 shrink-0">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative">
          <div className="relative rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-white/5 transition-all duration-300 focus-within:border-indigo-500/40 focus-within:shadow-[0_0_24px_rgba(99,102,241,0.06)] flex items-end shadow-md">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isRecording ? "Listening to voice query..." : "Ask a query, analyze documents, or request MCQs..."}
              disabled={isLoading || isRecording}
              className="flex-1 max-h-[160px] min-h-[44px] py-3.5 px-4 bg-transparent outline-none border-none text-sm md:text-base text-slate-800 dark:text-gray-200 placeholder-slate-450 resize-none font-sans"
            />
            <div className="p-2 flex items-center space-x-2 select-none">
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all focus:outline-none active:scale-95 ${
                  isRecording 
                    ? 'bg-rose-600 text-white animate-mic-pulse shadow-[0_0_12px_rgba(220,38,38,0.4)] border border-rose-500' 
                    : 'bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white border border-slate-200 dark:border-white/5'
                }`}
                title={isRecording ? "Stop Recording" : "Record Voice Query"}
              >
                {isRecording ? <Square className="w-3.5 h-3.5 animate-pulse" /> : <Mic className="w-3.5 h-3.5" />}
              </button>
              <button
                type="submit"
                disabled={!input.trim() || isLoading || isRecording}
                className="w-8 h-8 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#5053df] hover:to-[#7c4bf3] disabled:bg-[#1E293B]/20 dark:disabled:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 text-white flex items-center justify-center transition-all shadow-md focus:outline-none hover:scale-105 active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <p className="text-[9px] text-center text-slate-400 dark:text-gray-550 mt-2.5 font-mono uppercase tracking-widest select-none">
            Smart Query Routing maps requests automatically. Cites resources, sites, and logs confidence.
          </p>
        </form>
      </div>
    </div>
  );
}
