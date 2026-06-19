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
    <div className="flex h-screen bg-[#212121] text-gray-200 overflow-hidden font-sans select-none">
      
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
          <div className="flex-1 flex flex-col bg-[#212121] overflow-y-auto p-6 md:p-10">
            <div className="max-w-4xl mx-auto w-full">
              <div className="mb-6 flex items-center space-x-3 text-emerald-400">
                <GraduationCap className="w-8 h-8" />
                <h1 className="text-2xl font-extrabold text-white">Interactive Study Workspace</h1>
              </div>
              <p className="text-sm text-gray-400 mb-8">
                Compile quiz worksheets, review cards, and interview cheat sheets instantly based on your parsed documents.
              </p>
              {/* Configurations Header */}
              <div className="bg-[#171717] border border-[#2f2f2f] rounded-2xl p-6 mb-8 grid grid-cols-1 sm:grid-cols-4 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Resource Format</label>
                  <select 
                    value={studyType} 
                    onChange={e => setStudyType(e.target.value)}
                    className="w-full py-2 px-3 bg-[#212121] border border-[#3d3d3d] rounded-lg text-sm text-gray-200 outline-none focus:border-emerald-600 transition-colors"
                  >
                    <option value="mcqs">Multiple Choice (MCQ)</option>
                    <option value="flashcards">Flashcards Match</option>
                    <option value="interview">Interview Prep</option>
                    <option value="notes">Revision Sheet</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Difficulty Tier</label>
                  <select 
                    value={studyDiff} 
                    onChange={e => setStudyDiff(e.target.value)}
                    className="w-full py-2 px-3 bg-[#212121] border border-[#3d3d3d] rounded-lg text-sm text-gray-200 outline-none focus:border-emerald-600 transition-colors"
                  >
                    <option value="easy">Easy Level</option>
                    <option value="medium">Medium Level</option>
                    <option value="hard">Hard Level</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Number of Questions</label>
                  <select 
                    value={studyCount} 
                    onChange={e => setStudyCount(Number(e.target.value))}
                    disabled={studyType === 'notes'}
                    className="w-full py-2 px-3 bg-[#212121] border border-[#3d3d3d] rounded-lg text-sm text-gray-200 outline-none focus:border-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition-colors focus:outline-none shadow-md"
                  >
                    {studyLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Compiling...</span>
                      </>
                    ) : (
                      <>
                        <BookOpen className="w-4 h-4" />
                        <span>Generate Materials</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Generation outputs display panels */}
              {studyData && (
                <div className="bg-[#171717] border border-[#2f2f2f] rounded-2xl p-6 animate-fade-in select-text">
                  {studyType === 'mcqs' && studyData.questions && (
                    <div className="space-y-6">
                      <h2 className="text-lg font-bold text-white mb-4">Worksheet: Multiple Choice Quiz</h2>
                      {studyData.questions.map((q, qIdx) => (
                        <div key={qIdx} className="bg-[#212121] p-4 rounded-xl border border-[#2f2f2f]">
                          <p className="font-semibold text-sm mb-3">{qIdx + 1}. {q.question}</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                            {q.options.map((opt, oIdx) => {
                              const isSelected = selectedAnswers[qIdx] === opt;
                              const isCorrect = opt === q.correct_answer;
                              const answered = selectedAnswers[qIdx] !== undefined;
                              
                              return (
                                <button
                                  key={oIdx}
                                  onClick={() => !answered && setSelectedAnswers(prev => ({...prev, [qIdx]: opt}))}
                                  className={`py-2 px-3 rounded-lg text-xs text-left transition-all ${
                                    isSelected 
                                      ? (isCorrect ? 'bg-emerald-950/40 border-emerald-500 text-emerald-400' : 'bg-rose-950/40 border-rose-500 text-rose-400')
                                      : (answered && isCorrect ? 'bg-emerald-950/20 border-emerald-800 text-emerald-500' : 'bg-[#171717] border-[#2f2f2f] hover:border-gray-500')
                                  } border`}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                          {selectedAnswers[qIdx] !== undefined && (
                            <div className="text-xs text-gray-400 pt-2 border-t border-[#3c3c3c] flex items-start space-x-2">
                              {selectedAnswers[qIdx] === q.correct_answer ? (
                                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                              ) : (
                                <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                              )}
                              <p>
                                <span className="font-bold text-emerald-400">Correct: {q.correct_answer}.</span> {q.explanation}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {studyType === 'flashcards' && studyData.flashcards && (
                    <div>
                      <h2 className="text-lg font-bold text-white mb-6">Worksheet: Flashcard Recalls</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {studyData.flashcards.map((fc, idx) => {
                          const isFlipped = flippedCards[idx];
                          return (
                            <div 
                              key={idx}
                              onClick={() => setFlippedCards(prev => ({...prev, [idx]: !isFlipped}))}
                              className="h-40 bg-[#212121] hover:bg-[#282828] border border-[#2f2f2f] rounded-xl p-6 flex flex-col justify-center items-center text-center cursor-pointer select-none transition-all relative"
                            >
                              <span className="absolute top-2 right-2 text-[9px] uppercase font-mono text-gray-500">
                                {isFlipped ? "Answer" : "Question"}
                              </span>
                              <p className={`text-sm ${isFlipped ? 'text-emerald-400 font-bold' : 'text-gray-200'}`}>
                                {isFlipped ? fc.back : fc.front}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {studyType === 'interview' && studyData.qa && (
                    <div className="space-y-4">
                      <h2 className="text-lg font-bold text-white mb-4">Worksheet: Interview Q&A</h2>
                      {studyData.qa.map((qa, idx) => (
                        <div key={idx} className="bg-[#212121] p-4 rounded-xl border border-[#2f2f2f]">
                          <p className="font-bold text-sm text-emerald-400 mb-2">Q: {qa.question}</p>
                          <p className="text-xs text-gray-300">A: {qa.answer}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {studyType === 'notes' && studyData.text && (
                    <div>
                      <h2 className="text-lg font-bold text-white mb-4">Worksheet: Markdown Revision Guide</h2>
                      <div className="bg-[#212121] p-6 rounded-xl border border-[#2f2f2f] prose prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
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
          <div className="flex-1 flex flex-col bg-[#212121] overflow-y-auto p-6 md:p-10">
            <div className="max-w-4xl mx-auto w-full">
              <div className="mb-6 flex items-center space-x-3 text-emerald-400">
                <Network className="w-8 h-8" />
                <h1 className="text-2xl font-extrabold text-white">GraphRAG Relationship Explorer</h1>
              </div>
              <p className="text-sm text-gray-400 mb-8">
                Examine connections and shortest relationship paths between entities extracted automatically during file ingestions.
              </p>

              <form onSubmit={handleFindGraphPath} className="bg-[#171717] border border-[#2f2f2f] rounded-2xl p-6 mb-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Source Entity</label>
                  <input
                    type="text"
                    value={graphSource}
                    onChange={e => setGraphSource(e.target.value)}
                    placeholder="e.g. Elon Musk"
                    className="w-full py-2 px-3 bg-[#212121] border border-[#3d3d3d] rounded-lg text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-emerald-600 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Target Entity</label>
                  <input
                    type="text"
                    value={graphTarget}
                    onChange={e => setGraphTarget(e.target.value)}
                    placeholder="e.g. Tesla"
                    className="w-full py-2 px-3 bg-[#212121] border border-[#3d3d3d] rounded-lg text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-emerald-600 transition-colors"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={graphLoading}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition-colors focus:outline-none shadow-md"
                  >
                    {graphLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    <span>Search Connections</span>
                  </button>
                </div>
              </form>

              {graphError && (
                <div className="bg-rose-950/20 border border-rose-900/50 p-4 rounded-xl text-xs text-rose-400 font-medium">
                  {graphError}
                </div>
              )}

              {graphPathData && (
                <div className="bg-[#171717] border border-[#2f2f2f] rounded-2xl p-6 animate-fade-in select-text">
                  <h2 className="text-lg font-bold text-white mb-4">Connection Path Results</h2>
                  <div className="flex flex-col space-y-4">
                    {graphPathData.details.map((link, idx) => (
                      <div key={idx} className="flex items-center space-x-3 bg-[#212121] p-3 rounded-lg border border-[#2f2f2f] text-xs">
                        <div className="px-2.5 py-1 bg-emerald-950 border border-emerald-800 text-emerald-400 rounded">
                          <strong>{link.source}</strong> ({link.source_type})
                        </div>
                        <div className="text-gray-400 font-mono italic">
                          ─── [ {link.relationship} ] ───▶
                        </div>
                        <div className="px-2.5 py-1 bg-[#171717] border border-[#2f2f2f] text-gray-300 rounded">
                          <strong>{link.target}</strong> ({link.target_type})
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
          <div className="flex-1 flex flex-col bg-[#212121] overflow-y-auto p-6 md:p-10">
            <div className="max-w-4xl mx-auto w-full">
              <div className="mb-6 flex items-center space-x-3 text-emerald-400">
                <Eye className="w-8 h-8" />
                <h1 className="text-2xl font-extrabold text-white">Visual Context Document Preview</h1>
              </div>
              <p className="text-sm text-gray-400 mb-8">
                Examine context document structure and view active index chunks metadata directly.
              </p>
              
              {activeDocument ? (
                <div className="bg-[#171717] border border-[#2f2f2f] rounded-2xl p-6 select-text">
                  <h2 className="text-lg font-bold text-white mb-4">Document Details</h2>
                  <div className="bg-[#212121] p-4 rounded-xl border border-[#2f2f2f] space-y-3 text-sm">
                    <p className="text-gray-300"><span className="font-bold text-gray-400">File:</span> {activeDocument.name}</p>
                    <p className="text-gray-300"><span className="font-bold text-gray-400">Active blocks:</span> {activeDocument.chunks} chunks loaded in FAISS</p>
                    <div className="h-64 bg-[#171717] rounded-lg border border-[#2f2f2f] flex items-center justify-center text-gray-500 italic">
                      Thumbnail previews served natively via browser parser.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-[#171717] border border-[#2f2f2f] rounded-2xl p-10 text-center text-gray-500 italic text-sm">
                  Please select or ingest a file context block to preview chunks visually.
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
