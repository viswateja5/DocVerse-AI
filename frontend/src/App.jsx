import React, { useState, useEffect } from 'react';
import { 
  Menu, 
  X, 
  Database,
  GraduationCap,
  Network,
  Eye,
  BookOpen,
  ArrowRight,
  HelpCircle,
  CheckCircle,
  XCircle,
  FileDown,
  RefreshCw,
  Search
} from 'lucide-react';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import { 
  fetchSessions, 
  fetchSessionHistory, 
  deleteSession, 
  queryStream,
  exportSession,
  fetchEduContent,
  fetchGraphPath,
  fetchGraphData,
  fetchSessionDocuments,
  deleteDocument
} from './api';

const generateSessionId = () => `session_${Math.random().toString(36).substring(2, 9)}`;

export default function App() {
  const [view, setView] = useState('login'); // 'login' | 'register' | 'chat' | 'dashboard'
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [sessions, setSessions] = useState([]);
  const [allMessages, setAllMessages] = useState({});
  const [activeDocument, setActiveDocument] = useState(null);
  const [sessionDocuments, setSessionDocuments] = useState([]);
  const [globalSearch, setGlobalSearch] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleUploadSuccess = async () => {
    if (!sessionId) return;
    try {
      const docs = await fetchSessionDocuments(sessionId);
      setSessionDocuments(docs);
    } catch (err) {
      console.error("Failed to reload session documents:", err);
    }
  };

  const handleDeleteDocument = async (docId) => {
    try {
      await deleteDocument(docId);
      setSessionDocuments(prev => prev.filter(d => (d.id !== docId && d.document_id !== docId)));
      // Also clear active document if it matches
      if (activeDocument && activeDocument.id === docId) {
        setActiveDocument(null);
      }
    } catch (err) {
      console.error("Failed to delete document:", err);
      alert("Failed to delete document.");
    }
  };
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Workspace tabs: 'chat' | 'study' | 'graph' | 'preview'
  const [activeTab, setActiveTab] = useState('chat');

  // Study workspace state
  const [studyType, setStudyType] = useState('mcqs'); // 'mcqs' | 'flashcards' | 'interview' | 'notes'
  const [studyDiff, setStudyDiff] = useState('medium'); // 'easy' | 'medium' | 'hard'
  const [studyCount, setStudyCount] = useState(5); // 5 | 10 | 15 | 20
  const [studyData, setStudyData] = useState(null);
  const [studyLoading, setStudyLoading] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState({}); // { qIdx: selectedOption }
  const [flippedCards, setFlippedCards] = useState({}); // { cardIdx: boolean }

  // GraphRAG state
  const [graphSource, setGraphSource] = useState('');
  const [graphTarget, setGraphTarget] = useState('');
  const [graphPathData, setGraphPathData] = useState(null);
  const [graphLoading, setGraphLoading] = useState(false);
  const [graphError, setGraphError] = useState('');

  // Authenticate on mount checking local storage
  useEffect(() => {
    const token = localStorage.getItem('rag_token');
    if (token) {
      setIsAuthenticated(true);
      setView('chat');
    } else {
      setIsAuthenticated(false);
      setView('login');
    }
  }, []);

  // Load user sessions from database when entering 'chat' view
  useEffect(() => {
    if (view === 'chat') {
      loadSessions(true);
    }
  }, [view]);

  // Load session documents when active sessionId changes
  useEffect(() => {
    if (sessionId && view === 'chat') {
      const loadDocs = async () => {
        try {
          const docs = await fetchSessionDocuments(sessionId);
          setSessionDocuments(docs);
        } catch (err) {
          console.error("Failed to load documents for session:", err);
        }
      };
      loadDocs();
    } else {
      setSessionDocuments([]);
    }
  }, [sessionId, view]);

  const loadSessions = async (autoSelect = true) => {
    try {
      const data = await fetchSessions();
      setSessions(data);
      
      const newAllMessages = {};
      data.forEach(sess => {
        newAllMessages[sess.id] = sess.messages || [];
      });
      setAllMessages(newAllMessages);

      if (autoSelect) {
        if (data.length > 0) {
          setSessionId(data[0].id);
        } else {
          const newId = generateSessionId();
          setSessionId(newId);
          setSessions([{ id: newId, name: 'New Conversation' }]);
          setAllMessages({ [newId]: [] });
        }
      }
    } catch (err) {
      console.error("Failed to fetch sessions from server:", err);
      if (err.response?.status === 401) {
        handleLogout();
      }
    }
  };

  const handleSelectSession = async (id) => {
    setSessionId(id);
    setMobileMenuOpen(false);
    setStudyData(null);
    setGraphPathData(null);
    
    try {
      const data = await fetchSessionHistory(id);
      setAllMessages(prev => ({
        ...prev,
        [id]: data.messages || []
      }));
    } catch (err) {
      if (err.response?.status !== 404) {
        console.error(`Failed to load history for session ${id}:`, err);
      }
    }
  };

  const handleNewChat = () => {
    const newId = generateSessionId();
    setSessionId(newId);
    setSessions(prev => [
      { id: newId, name: 'New Conversation' },
      ...prev
    ]);
    setAllMessages(prev => ({
      ...prev,
      [newId]: []
    }));
    setSessionDocuments([]);
    setMobileMenuOpen(false);
    setActiveTab('chat');
  };

  const handleDeleteSession = async (id) => {
    try {
      try {
        await deleteSession(id);
      } catch (err) {
        if (err.response?.status !== 404) {
          throw err;
        }
      }
      
      setSessions(prev => {
        const filtered = prev.filter(s => s.id !== id);
        if (id === sessionId) {
          if (filtered.length > 0) {
            setSessionId(filtered[0].id);
            fetchSessionHistory(filtered[0].id)
              .then(data => {
                setAllMessages(prevAll => ({
                  ...prevAll,
                  [filtered[0].id]: data.messages || []
                }));
              })
              .catch(e => console.error(e));
          } else {
            const newId = generateSessionId();
            setSessionId(newId);
            setAllMessages({ [newId]: [] });
            return [{ id: newId, name: 'New Conversation' }];
          }
        }
        return filtered;
      });

      setAllMessages(prev => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    } catch (err) {
      console.error("Failed to delete session:", err);
    }
  };

  const handleClearSessions = async () => {
    try {
      for (const s of sessions) {
        try {
          await deleteSession(s.id);
        } catch (e) {
          // ignore error
        }
      }
    } catch (err) {
      console.error("Failed to clear sessions:", err);
    }
    
    const newId = generateSessionId();
    setSessionId(newId);
    setSessions([{ id: newId, name: 'New Conversation' }]);
    setAllMessages({ [newId]: [] });
    setMobileMenuOpen(false);
  };

  const handleSendMessage = async (text) => {
    if (!text.trim() || isLoading) return;

    const userMsg = { 
      role: 'user', 
      content: text,
      created_at: new Date().toISOString()
    };
    const currentMsgs = allMessages[sessionId] || [];
    
    const assistantMsg = { 
      role: 'assistant', 
      content: '', 
      sources: [],
      decision: '',
      reasoning_trace: [],
      confidence_score: 0.95,
      created_at: new Date().toISOString()
    };
    
    setAllMessages(prev => ({
      ...prev,
      [sessionId]: [...currentMsgs, userMsg, assistantMsg]
    }));
    
    setIsLoading(true);

    let streamAnswer = "";
    let streamSources = [];
    let streamDecision = "";
    let streamTrace = [];
    let streamConfidence = 0.95;

    const updateAssistantState = (newAnswer, newSources, newDecision, newTrace, newConfidence) => {
      setAllMessages(prev => {
        const list = prev[sessionId] || [];
        if (list.length === 0) return prev;
        const updatedList = [...list];
        updatedList[updatedList.length - 1] = {
          ...updatedList[updatedList.length - 1],
          content: newAnswer,
          sources: newSources,
          decision: newDecision,
          reasoning_trace: newTrace,
          confidence_score: newConfidence
        };
        return {
          ...prev,
          [sessionId]: updatedList
        };
      });
    };

    try {
      await queryStream(
        text,
        sessionId,
        globalSearch,
        (token) => {
          streamAnswer += token;
          updateAssistantState(streamAnswer, streamSources, streamDecision, streamTrace, streamConfidence);
        },
        (sources) => {
          streamSources = sources;
          updateAssistantState(streamAnswer, streamSources, streamDecision, streamTrace, streamConfidence);
        },
        (error) => {
          console.error("Query stream error:", error);
          const errDetail = error.message || "Failed to receive streaming response.";
          streamAnswer += `\n[Stream Error: {errDetail}]`;
          updateAssistantState(streamAnswer, streamSources, streamDecision, streamTrace, streamConfidence);
          setIsLoading(false);
        },
        () => {
          setIsLoading(false);
          setSessions(prev => prev.map(s => {
            if (s.id === sessionId && (s.name === 'New Conversation' || s.name === 'General Document Query')) {
              return { ...s, name: text.length > 25 ? `${text.substring(0, 22)}...` : text };
            }
            return s;
          }));
        },
        (trace) => {
          streamTrace = trace;
          updateAssistantState(streamAnswer, streamSources, streamDecision, streamTrace, streamConfidence);
        },
        (decision) => {
          streamDecision = decision;
          updateAssistantState(streamAnswer, streamSources, streamDecision, streamTrace, streamConfidence);
        },
        (confidence) => {
          streamConfidence = confidence;
          updateAssistantState(streamAnswer, streamSources, streamDecision, streamTrace, streamConfidence);
        }
      );
    } catch (err) {
      console.error(err);
      setIsLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      setIsLoading(true);
      const blobData = await exportSession(sessionId, format);
      const blob = new Blob([blobData], { 
        type: format === 'markdown' ? 'text/markdown' : 'text/html' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `session_${sessionId}.${format === 'markdown' ? 'md' : format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export chat session.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateStudy = async () => {
    setStudyLoading(true);
    setStudyData(null);
    setSelectedAnswers({});
    setFlippedCards({});
    
    try {
      const data = await fetchEduContent(sessionId, studyType, studyDiff, studyCount);
      setStudyData(data);
    } catch (err) {
      console.error(err);
      alert("Failed to compile study quiz materials.");
    } finally {
      setStudyLoading(false);
    }
  };

  const handleFindGraphPath = async (e) => {
    e.preventDefault();
    if (!graphSource.trim() || !graphTarget.trim()) return;

    setGraphLoading(true);
    setGraphPathData(null);
    setGraphError('');

    try {
      const data = await fetchGraphPath(sessionId, graphSource.trim(), graphTarget.trim());
      if (data.found) {
        setGraphPathData(data);
      } else {
        setGraphError(data.message || "No relationship path found.");
      }
    } catch (err) {
      console.error(err);
      setGraphError("Failed to trace graph relationships.");
    } finally {
      setGraphLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('rag_token');
    setIsAuthenticated(false);
    setView('login');
    setSessionId('');
    setSessions([]);
    setAllMessages({});
    setActiveDocument(null);
  };

  if (view === 'login') {
    return (
      <Login 
        onLoginSuccess={() => {
          setIsAuthenticated(true);
          setView('chat');
        }}
        onNavigateToSignup={() => setView('register')}
      />
    );
  }

  if (view === 'register') {
    return (
      <Register
        onSignupSuccess={() => setView('login')}
        onNavigateToLogin={() => setView('login')}
      />
    );
  }

  if (view === 'dashboard') {
    return (
      <Dashboard 
        onBackToChat={() => setView('chat')}
      />
    );
  }

  const currentMessages = allMessages[sessionId] || [];

  return (
    <div className="flex h-screen bg-[#0d0e12] text-gray-200 overflow-hidden font-sans select-none">
      
      {/* Desktop Sidebar Panel */}
      <div className="hidden md:flex h-full shrink-0">
        <Sidebar
          sessionId={sessionId}
          sessions={sessions}
          onSelectSession={handleSelectSession}
          onDeleteSession={handleDeleteSession}
          onNewChat={handleNewChat}
          onClearSessions={handleClearSessions}
          activeDocument={activeDocument}
          setActiveDocument={setActiveDocument}
          sessionDocuments={sessionDocuments}
          onDeleteDocument={handleDeleteDocument}
          onUploadSuccess={handleUploadSuccess}
          onLogout={handleLogout}
          onOpenDashboard={() => setView('dashboard')}
          activeTab={activeTab}
          onChangeTab={setActiveTab}
        />
      </div>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="md:hidden h-14 bg-[#171717] border-b border-[#2f2f2f] px-4 flex items-center justify-between shrink-0">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex items-center space-x-1.5">
            <Database className="w-5 h-5 text-emerald-500" />
            <span className="font-semibold text-sm">DocSearch Agent</span>
          </div>
          
          <div className="w-6" />
        </header>

        {/* Tab-driven layout rendering */}
        {activeTab === 'chat' && (
          <ChatWindow
            messages={currentMessages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            activeDocument={activeDocument}
            onExport={handleExport}
            globalSearch={globalSearch}
            setGlobalSearch={setGlobalSearch}
          />
        )}

        {/* Study Center Workspace */}
        {activeTab === 'study' && (
          <div className="flex-1 flex flex-col bg-[#0e0f13] overflow-y-auto p-6 md:p-10 select-none">
            <div className="max-w-4xl mx-auto w-full animate-fade-in">
              <div className="mb-6 flex items-center space-x-3 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
                <GraduationCap className="w-8 h-8 text-emerald-400 shrink-0" />
                <h1 className="text-3xl font-extrabold tracking-tight text-white">Interactive Study Workspace</h1>
              </div>
              <p className="text-sm text-gray-400 mb-8 max-w-2xl">
                Compile interactive quiz worksheets, review card recall tools, and interview prep guides instantly compiled by scanning your ingested document context.
              </p>
              
              {/* Configurations Header */}
              <div className="bg-[#13141c]/80 border border-white/5 rounded-2xl p-6 mb-8 grid grid-cols-1 sm:grid-cols-4 gap-5 backdrop-blur-md shadow-xl select-none">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Resource Format</label>
                  <select 
                    value={studyType} 
                    onChange={e => setStudyType(e.target.value)}
                    className="w-full py-2.5 px-3 bg-[#181922] border border-white/5 rounded-xl text-xs text-gray-200 outline-none focus:border-emerald-500 transition-all duration-300 font-bold"
                  >
                    <option value="mcqs">Multiple Choice (MCQ)</option>
                    <option value="flashcards">Flashcards Match</option>
                    <option value="interview">Interview Prep</option>
                    <option value="notes">Revision Sheet</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Difficulty Tier</label>
                  <select 
                    value={studyDiff} 
                    onChange={e => setStudyDiff(e.target.value)}
                    className="w-full py-2.5 px-3 bg-[#181922] border border-white/5 rounded-xl text-xs text-gray-200 outline-none focus:border-emerald-500 transition-all duration-300 font-bold"
                  >
                    <option value="easy">Easy Level</option>
                    <option value="medium">Medium Level</option>
                    <option value="hard">Hard Level</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Number of Questions</label>
                  <select 
                    value={studyCount} 
                    onChange={e => setStudyCount(Number(e.target.value))}
                    disabled={studyType === 'notes'}
                    className="w-full py-2.5 px-3 bg-[#181922] border border-white/5 rounded-xl text-xs text-gray-200 outline-none focus:border-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 font-bold"
                  >
                    <option value={3}>3 Items</option>
                    <option value={5}>5 Items</option>
                    <option value={10}>10 Items</option>
                    <option value={15}>15 Items</option>
                    <option value={20}>20 Items</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleGenerateStudy}
                    disabled={studyLoading}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] disabled:bg-gray-800 disabled:from-gray-800 disabled:to-gray-800 disabled:scale-100 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all duration-300 shadow-[0_4px_12px_rgba(16,185,129,0.15)] focus:outline-none"
                  >
                    {studyLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>Compiling...</span>
                      </>
                    ) : (
                      <>
                        <BookOpen className="w-4 h-4 text-white" />
                        <span>Generate Materials</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Generation outputs display panels */}
              {studyData && (
                <div className="bg-[#13141c]/60 border border-white/5 rounded-2xl p-6 shadow-2xl animate-fade-in select-text">
                  
                  {/* MCQ quiz template format */}
                  {studyType === 'mcqs' && studyData.questions && (
                    <div className="space-y-6">
                      <div className="border-b border-white/5 pb-4 mb-4">
                        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                          <span className="text-emerald-400">📝</span>
                          <span>Worksheet: Multiple Choice Quiz</span>
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">Select your answers below. Explanations will reveal automatically.</p>
                      </div>
                      
                      {studyData.questions.map((q, qIdx) => (
                        <div key={qIdx} className="bg-[#16171f]/80 p-5 rounded-xl border border-white/5 hover:border-white/10 transition-all duration-300 shadow-sm animate-fade-in">
                          <p className="font-semibold text-sm text-gray-100 mb-4 flex items-start">
                            <span className="text-emerald-400 font-mono font-bold mr-2">{qIdx + 1}.</span>
                            <span>{q.question}</span>
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                            {q.options.map((opt, oIdx) => {
                              const isSelected = selectedAnswers[qIdx] === opt;
                              const isCorrect = opt === q.correct_answer;
                              const answered = selectedAnswers[qIdx] !== undefined;
                              
                              return (
                                <button
                                  key={oIdx}
                                  onClick={() => !answered && setSelectedAnswers(prev => ({...prev, [qIdx]: opt}))}
                                  className={`py-3 px-4 rounded-xl text-xs text-left transition-all duration-300 font-medium border ${
                                    isSelected 
                                      ? (isCorrect 
                                          ? 'bg-emerald-950/40 border-emerald-500 text-emerald-400 font-bold scale-[1.02] shadow-[0_0_12px_rgba(16,185,129,0.15)]' 
                                          : 'bg-rose-950/40 border-rose-500 text-rose-400 font-bold scale-[1.02] shadow-[0_0_12px_rgba(244,63,94,0.15)]')
                                      : (answered && isCorrect 
                                          ? 'bg-emerald-950/20 border-emerald-800 text-emerald-400' 
                                          : 'bg-[#121319] border-white/5 hover:border-white/20 text-gray-400 hover:text-gray-200 hover:scale-[1.01]')
                                  }`}
                                >
                                  <span className="inline-block w-5 h-5 rounded-full bg-black/35 text-center leading-5 text-[10px] mr-2 font-mono text-gray-500 uppercase">
                                    {String.fromCharCode(65 + oIdx)}
                                  </span>
                                  <span>{opt}</span>
                                </button>
                              );
                            })}
                          </div>
                          {selectedAnswers[qIdx] !== undefined && (
                            <div className="text-xs text-gray-300 pt-3.5 border-t border-white/5 flex items-start space-x-2.5 bg-black/20 p-3 rounded-lg animate-fade-in">
                              {selectedAnswers[qIdx] === q.correct_answer ? (
                                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                              ) : (
                                <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                              )}
                              <div>
                                <p className="font-bold text-emerald-400">Correct Answer: {q.correct_answer}.</p>
                                <p className="text-gray-400 mt-1 leading-relaxed">{q.explanation}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Interactive 3D Flashcards template format */}
                  {studyType === 'flashcards' && studyData.flashcards && (
                    <div>
                      <div className="border-b border-white/5 pb-4 mb-6">
                        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                          <span className="text-emerald-400">🎴</span>
                          <span>Worksheet: Flashcard Recalls</span>
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">Click cards to spin them in 3D and reveal the concept definition.</p>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {studyData.flashcards.map((fc, idx) => {
                          const isFlipped = flippedCards[idx];
                          return (
                            <div key={idx} className="card-container h-44 cursor-pointer select-none">
                              <div 
                                className={`card-inner ${isFlipped ? 'flipped' : ''}`}
                                onClick={() => setFlippedCards(prev => ({...prev, [idx]: !isFlipped}))}
                              >
                                {/* Front Face */}
                                <div className="card-front bg-gradient-to-br from-[#161720] to-[#121319] border border-white/5 hover:border-emerald-500/20 p-6 shadow-xl flex flex-col justify-between">
                                  <div className="w-full flex justify-between items-center text-[9px] uppercase tracking-wider font-mono font-bold text-gray-500">
                                    <span>Card {idx + 1}</span>
                                    <span>Click to reveal</span>
                                  </div>
                                  <p className="text-sm font-bold text-gray-200 text-center flex-1 flex items-center justify-center max-w-[240px]">
                                    {fc.front}
                                  </p>
                                  <div className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest border border-emerald-500/20 px-2 py-0.5 rounded bg-emerald-950/20">
                                    QUESTION
                                  </div>
                                </div>
                                
                                {/* Back Face */}
                                <div className="card-back bg-gradient-to-br from-[#0a0b0e] to-[#0e1017] border border-emerald-500/20 p-6 shadow-2xl flex flex-col justify-between">
                                  <div className="w-full flex justify-between items-center text-[9px] uppercase tracking-wider font-mono font-bold text-emerald-500/40">
                                    <span>Answer Side</span>
                                    <span>Click to flip back</span>
                                  </div>
                                  <p className="text-sm font-bold text-emerald-400 text-center flex-1 flex items-center justify-center leading-relaxed">
                                    {fc.back}
                                  </p>
                                  <div className="text-[9px] text-teal-400 font-bold uppercase tracking-widest border border-teal-500/20 px-2 py-0.5 rounded bg-teal-950/20">
                                    DEFINITION
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Interview prep template format */}
                  {studyType === 'interview' && studyData.qa && (
                    <div className="space-y-4">
                      <div className="border-b border-white/5 pb-4 mb-4">
                        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                          <span className="text-emerald-400">🎤</span>
                          <span>Worksheet: Interview Q&A Guide</span>
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">Review standard interview answers generated dynamically for your ingestion context.</p>
                      </div>
                      
                      {studyData.qa.map((qa, idx) => (
                        <div key={idx} className="bg-[#16171f]/80 p-5 rounded-xl border border-white/5 hover:border-white/10 hover:scale-[1.01] transition-all duration-300 shadow-sm animate-fade-in">
                          <p className="font-bold text-sm text-emerald-400 mb-2.5 flex items-start">
                            <span className="mr-2 font-mono">Q:</span>
                            <span>{qa.question}</span>
                          </p>
                          <p className="text-xs text-gray-300 leading-relaxed pl-5 border-l border-emerald-500/30">
                            <span className="font-bold text-gray-400 block mb-1 uppercase text-[9px] tracking-wider">Suggested Answer:</span>
                            {qa.answer}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Notes template format */}
                  {studyType === 'notes' && studyData.text && (
                    <div>
                      <div className="border-b border-white/5 pb-4 mb-4">
                        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                          <span className="text-emerald-400">📚</span>
                          <span>Worksheet: Revision Study Sheets</span>
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">Comprehensive structured breakdown of core document information.</p>
                      </div>
                      
                      <div className="bg-[#16171f]/60 p-6 rounded-xl border border-white/5 prose prose-invert max-w-none text-xs md:text-sm text-gray-300 leading-relaxed whitespace-pre-wrap select-text font-sans">
                        {studyData.text}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* GraphRAG Explorer Workspace */}
        {activeTab === 'graph' && (
          <div className="flex-1 flex flex-col bg-[#0e0f13] overflow-y-auto p-6 md:p-10 select-none">
            <div className="max-w-4xl mx-auto w-full animate-fade-in">
              <div className="mb-6 flex items-center space-x-3 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-indigo-400">
                <Network className="w-8 h-8 text-emerald-400 shrink-0" />
                <h1 className="text-3xl font-extrabold tracking-tight text-white">GraphRAG Relationship Explorer</h1>
              </div>
              <p className="text-sm text-gray-400 mb-8 max-w-2xl">
                Examine connections and shortest relationship paths between entities extracted automatically during document parsing.
              </p>

              <form onSubmit={handleFindGraphPath} className="bg-[#13141c]/80 border border-white/5 rounded-2xl p-6 mb-8 grid grid-cols-1 sm:grid-cols-3 gap-5 backdrop-blur-md shadow-xl select-none">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Source Entity</label>
                  <input
                    type="text"
                    value={graphSource}
                    onChange={e => setGraphSource(e.target.value)}
                    placeholder="e.g. Elon Musk"
                    className="w-full py-2.5 px-3 bg-[#181922] border border-white/5 rounded-xl text-xs text-gray-200 placeholder-gray-600 outline-none focus:border-emerald-500 transition-all duration-300"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Target Entity</label>
                  <input
                    type="text"
                    value={graphTarget}
                    onChange={e => setGraphTarget(e.target.value)}
                    placeholder="e.g. Tesla"
                    className="w-full py-2.5 px-3 bg-[#181922] border border-white/5 rounded-xl text-xs text-gray-200 placeholder-gray-600 outline-none focus:border-emerald-500 transition-all duration-300"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={graphLoading}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 active:scale-[0.98] disabled:scale-100 disabled:bg-gray-800 disabled:from-gray-800 disabled:to-gray-800 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all duration-300 shadow-[0_4px_12px_rgba(99,102,241,0.15)] focus:outline-none"
                  >
                    {graphLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <Search className="w-4 h-4 text-white" />
                    )}
                    <span>Search Connections</span>
                  </button>
                </div>
              </form>

              {graphError && (
                <div className="bg-rose-950/20 border border-rose-800/30 p-4 rounded-xl text-xs text-rose-400 font-bold text-center animate-fade-in shadow-sm">
                  ⚠️ {graphError}
                </div>
              )}

              {graphPathData && (
                <div className="bg-[#13141c]/60 border border-white/5 rounded-2xl p-6 shadow-2xl animate-fade-in select-text">
                  <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2 border-b border-white/5 pb-3">
                    <span className="text-indigo-400">🔗</span>
                    <span>Shortest Relationship Path Results</span>
                  </h2>
                  <div className="flex flex-col space-y-4">
                    {graphPathData.details.map((link, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row items-center justify-between bg-[#16171f]/80 p-4 rounded-xl border border-white/5 text-xs shadow-sm hover:scale-[1.01] hover:border-emerald-500/20 transition-all duration-300">
                        <div className="px-3.5 py-2 bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 rounded-xl flex flex-col items-center sm:items-start max-w-[200px] truncate shadow-inner">
                          <strong className="text-white truncate max-w-xs">{link.source}</strong>
                          <span className="text-[9px] uppercase font-mono tracking-widest text-emerald-500/60 mt-0.5">{link.source_type}</span>
                        </div>
                        <div className="my-2 sm:my-0 text-indigo-400 font-bold font-mono text-[10px] uppercase tracking-widest flex flex-col items-center shrink-0">
                          <span className="px-3 py-1 bg-indigo-950/20 border border-indigo-500/20 rounded-full">{link.relationship}</span>
                          <span className="text-[14px] mt-1 tracking-widest leading-none">───▶</span>
                        </div>
                        <div className="px-3.5 py-2 bg-indigo-950/20 border border-white/5 text-gray-200 rounded-xl flex flex-col items-center sm:items-start max-w-[200px] truncate">
                          <strong className="text-white truncate max-w-xs">{link.target}</strong>
                          <span className="text-[9px] uppercase font-mono tracking-widest text-gray-500 mt-0.5">{link.target_type}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Document Preview Workspace */}
        {activeTab === 'preview' && (
          <div className="flex-1 flex flex-col bg-[#0e0f13] overflow-y-auto p-6 md:p-10 select-none">
            <div className="max-w-4xl mx-auto w-full animate-fade-in">
              <div className="mb-6 flex items-center space-x-3 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-indigo-400">
                <Eye className="w-8 h-8 text-emerald-400 shrink-0" />
                <h1 className="text-3xl font-extrabold tracking-tight text-white">Visual Context Document Preview</h1>
              </div>
              <p className="text-sm text-gray-400 mb-8 max-w-2xl">
                Examine structured indexing metadata and view loaded chunk structures directly in vector DB layout space.
              </p>
              
              {activeDocument ? (
                <div className="bg-[#13141c]/60 border border-white/5 rounded-2xl p-6 shadow-2xl animate-fade-in select-text">
                  <h2 className="text-lg font-bold text-white mb-4 border-b border-white/5 pb-3">Document Details</h2>
                  <div className="bg-[#16171f]/80 p-5 rounded-xl border border-white/5 space-y-4 text-xs md:text-sm">
                    <p className="text-gray-300 flex items-center justify-between">
                      <span className="font-bold text-gray-500 uppercase tracking-widest text-[10px]">File Context:</span> 
                      <span className="font-bold text-white bg-emerald-950/40 border border-emerald-500/20 px-3 py-1 rounded-xl shadow-inner">{activeDocument.name}</span>
                    </p>
                    <p className="text-gray-300 flex items-center justify-between">
                      <span className="font-bold text-gray-500 uppercase tracking-widest text-[10px]">Indexed blocks:</span> 
                      <span className="font-bold text-emerald-400">{activeDocument.chunks} chunks loaded in FAISS</span>
                    </p>
                    <div className="h-64 bg-black/40 rounded-xl border border-white/5 flex flex-col items-center justify-center text-gray-500 italic text-center p-6 shadow-inner select-none">
                      <Database className="w-10 h-10 text-emerald-500/20 mb-3" />
                      <span className="font-semibold text-xs text-gray-400">Thumbnail view active</span>
                      <p className="text-[10px] text-gray-600 mt-1.5 max-w-xs">Document chunks are parsed and loaded dynamically. Interactive canvas layers will load once context-focused queries are fired.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-[#13141c]/40 border border-white/5 rounded-2xl p-12 text-center text-gray-500 italic text-xs md:text-sm select-none shadow-md">
                  <Database className="w-8 h-8 text-gray-700 mx-auto mb-3" />
                  <span>Please select or ingest a file context block to preview chunks visually.</span>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Mobile Sidebar Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-black/60 backdrop-blur-sm">
          <div className="relative w-80 h-full flex flex-col animate-fade-in">
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-50"
            >
              <X className="w-5 h-5" />
            </button>
            <Sidebar
              sessionId={sessionId}
              sessions={sessions}
              onSelectSession={handleSelectSession}
              onDeleteSession={handleDeleteSession}
              onNewChat={handleNewChat}
              onClearSessions={handleClearSessions}
              activeDocument={activeDocument}
              setActiveDocument={setActiveDocument}
              sessionDocuments={sessionDocuments}
              onDeleteDocument={handleDeleteDocument}
              onUploadSuccess={handleUploadSuccess}
              onLogout={handleLogout}
              onOpenDashboard={() => setView('dashboard')}
              activeTab={activeTab}
              onChangeTab={setActiveTab}
            />
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

    </div>
  );
}
