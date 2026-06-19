import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  MessageSquare, 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Loader2, 
  Database,
  FileText,
  LogOut,
  BarChart3,
  X,
  GraduationCap,
  Network,
  Eye
} from 'lucide-react';
import { uploadDocument, checkHealth } from '../api';

export default function Sidebar({ 
  sessionId, 
  sessions, 
  onSelectSession, 
  onDeleteSession,
  onNewChat, 
  onClearSessions,
  activeDocument,
  setActiveDocument,
  sessionDocuments = [],
  onDeleteDocument,
  onUploadSuccess,
  onLogout,
  onOpenDashboard,
  activeTab = 'chat',
  onChangeTab
}) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [uploadState, setUploadState] = useState('idle'); // 'idle' | 'uploading' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [chunkCount, setChunkCount] = useState(null);
  const [backendStatus, setBackendStatus] = useState('connecting'); // 'connecting' | 'online' | 'offline'
  const fileInputRef = useRef(null);

  // Check health of backend on load
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        await checkHealth();
        setBackendStatus('online');
      } catch (err) {
        setBackendStatus('offline');
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getExtension = (filename) => {
    return filename.split('.').pop().toLowerCase();
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      const ext = getExtension(droppedFile.name);
      if (['pdf', 'docx', 'txt', 'csv', 'xlsx', 'xls'].includes(ext)) {
        setFile(droppedFile);
        setUploadState('idle');
      } else {
        setErrorMessage("Supported formats: PDF, DOCX, TXT, CSV, Excel");
        setUploadState('error');
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const ext = getExtension(selectedFile.name);
      if (['pdf', 'docx', 'txt', 'csv', 'xlsx', 'xls'].includes(ext)) {
        setFile(selectedFile);
        setUploadState('idle');
      } else {
        setErrorMessage("Supported formats: PDF, DOCX, TXT, CSV, Excel");
        setUploadState('error');
      }
    }
  };

  const onButtonClick = () => {
    fileInputRef.current.click();
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setUploadState('uploading');
    setErrorMessage('');
    
    try {
      const data = await uploadDocument(file, sessionId);
      setUploadState('success');
      setChunkCount(data.total_chunks);
      setActiveDocument({
        name: file.name,
        chunks: data.total_chunks
      });
      setFile(null);
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (error) {
      console.error(error);
      const detail = error.response?.data?.detail || "Upload ingestion failed. Verify configurations.";
      setErrorMessage(detail);
      setUploadState('error');
    }
  };

  return (
    <div className="w-full md:w-80 bg-gradient-to-b from-[#0b0c10] via-[#121318] to-[#171821] flex flex-col h-full text-gray-200 border-r border-white/5 shrink-0 font-sans shadow-[4px_0_24px_rgba(0,0,0,0.3)]">
      
      {/* Brand Header */}
      <div className="p-5 border-b border-white/5 flex items-center justify-between bg-black/20">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-950/30 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.1)]">
            <Database className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="font-bold text-base tracking-wide bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
            AI Knowledge Agent
          </span>
        </div>
        <div className="flex items-center space-x-1.5 bg-black/40 px-2 py-1 rounded-full border border-white/5">
          <span className={`w-2 h-2 rounded-full ${
            backendStatus === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 
            backendStatus === 'offline' ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]' : 
            'bg-amber-500 animate-pulse'
          }`} />
          <span className="text-[9px] text-gray-400 uppercase tracking-widest font-mono font-bold">
            {backendStatus}
          </span>
        </div>
      </div>

      {/* Primary Action Panel */}
      <div className="p-4 flex flex-col space-y-2">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] hover:scale-[1.01] transition-all duration-300 rounded-xl text-white font-bold text-xs shadow-[0_4px_14px_rgba(16,185,129,0.2)] hover:shadow-[0_4px_20px_rgba(16,185,129,0.35)] focus:outline-none"
        >
          <Plus className="w-4 h-4" />
          <span>New Chat Session</span>
        </button>
        <button
          onClick={onOpenDashboard}
          className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-white/5 hover:bg-white/10 active:scale-[0.98] hover:scale-[1.01] transition-all duration-300 border border-white/5 rounded-xl text-gray-200 font-bold text-xs focus:outline-none shadow-inner"
        >
          <BarChart3 className="w-4 h-4 text-emerald-400" />
          <span>Admin Stats Dashboard</span>
        </button>
      </div>

      {/* Workspace Tabs Navigation */}
      {onChangeTab && (
        <div className="px-4 pb-4 border-b border-white/5 flex flex-col space-y-1.5 select-none">
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
            Agent Workspaces
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onChangeTab('chat')}
              className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 border transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${
                activeTab === 'chat' 
                  ? 'bg-gradient-to-r from-emerald-950/30 to-teal-950/30 border-emerald-500/40 text-emerald-400 shadow-[0_4px_12px_rgba(16,185,129,0.12)]' 
                  : 'bg-white/5 border-transparent hover:border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chat</span>
            </button>
            <button
              onClick={() => onChangeTab('study')}
              className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 border transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${
                activeTab === 'study' 
                  ? 'bg-gradient-to-r from-emerald-950/30 to-teal-950/30 border-emerald-500/40 text-emerald-400 shadow-[0_4px_12px_rgba(16,185,129,0.12)]' 
                  : 'bg-white/5 border-transparent hover:border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Study</span>
            </button>
            <button
              onClick={() => onChangeTab('graph')}
              className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 border transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${
                activeTab === 'graph' 
                  ? 'bg-gradient-to-r from-emerald-950/30 to-teal-950/30 border-emerald-500/40 text-emerald-400 shadow-[0_4px_12px_rgba(16,185,129,0.12)]' 
                  : 'bg-white/5 border-transparent hover:border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>GraphRAG</span>
            </button>
            <button
              onClick={() => onChangeTab('preview')}
              className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 border transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${
                activeTab === 'preview' 
                  ? 'bg-gradient-to-r from-emerald-950/30 to-teal-950/30 border-emerald-500/40 text-emerald-400 shadow-[0_4px_12px_rgba(16,185,129,0.12)]' 
                  : 'bg-white/5 border-transparent hover:border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
          </div>
        </div>
      )}

      {/* Document Ingestion Widget */}
      <div className="p-4 border-b border-white/5 bg-black/10">
        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
          Ingest Knowledge Files
        </label>
        
        <div 
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={uploadState !== 'uploading' ? onButtonClick : null}
          className={`border border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-300 ${
            dragActive 
              ? 'border-emerald-500 bg-emerald-950/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
              : 'border-white/10 bg-[#16171e]/50 hover:bg-[#1c1d26]/50 hover:border-white/20 hover:scale-[1.01]'
          }`}
        >
          <input 
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.csv,.xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
            disabled={uploadState === 'uploading'}
          />
          
          <UploadCloud className="w-8 h-8 text-gray-400 mx-auto mb-2 group-hover:text-emerald-400 transition-colors" />
          <p className="text-xs text-gray-300 font-medium">
            Drag & drop here, or <span className="text-emerald-400 font-bold hover:underline">browse</span>
          </p>
          <p className="text-[10px] text-gray-500 mt-1">PDF, DOCX, TXT, CSV, Excel up to 20MB</p>
        </div>

        {/* Selected File Details */}
        {file && uploadState !== 'success' && (
          <div className="mt-3 bg-[#16171f] p-3 rounded-xl flex flex-col space-y-2 border border-white/5 shadow-md animate-fade-in">
            <div className="flex items-center space-x-2 text-xs">
              <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="truncate font-semibold text-gray-200 max-w-[160px]">{file.name}</span>
            </div>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleUpload();
              }}
              disabled={uploadState === 'uploading'}
              className="w-full py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 hover:scale-[1.01] active:scale-[0.98] text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-[0_2px_8px_rgba(16,185,129,0.15)]"
            >
              {uploadState === 'uploading' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Ingesting file...</span>
                </>
              ) : (
                <span>Ingest Document</span>
              )}
            </button>
          </div>
        )}

        {/* Alerts */}
        {uploadState === 'success' && (
          <div className="mt-3 bg-emerald-950/20 border border-emerald-800/30 p-2.5 rounded-xl flex items-start space-x-2.5 text-xs text-emerald-400 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            <div>
              <p className="font-bold">Ingested successfully!</p>
              <p className="text-[10px] text-emerald-500/80 mt-0.5">{chunkCount} chunks generated.</p>
            </div>
          </div>
        )}

        {uploadState === 'error' && (
          <div className="mt-3 bg-rose-950/20 border border-rose-800/30 p-2.5 rounded-xl flex items-start space-x-2.5 text-xs text-rose-400 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <div className="truncate max-w-[200px]">
              <p className="font-bold">Ingestion failed</p>
              <p className="text-[10px] text-rose-500/80 mt-0.5 truncate">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Active Context file */}
        {activeDocument && (
          <div className="mt-3 bg-[#1a1b24] p-2.5 rounded-xl border border-white/5 flex items-center justify-between text-xs text-gray-300 shadow-inner animate-fade-in">
            <div className="flex items-center space-x-2 truncate">
              <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="truncate">
                <p className="font-bold text-emerald-400 truncate max-w-[130px]">{activeDocument.name}</p>
                <p className="text-[10px] text-gray-500 font-mono">{activeDocument.chunks} chunks active</p>
              </div>
            </div>
            <button 
              onClick={() => setActiveDocument(null)}
              className="text-gray-500 hover:text-rose-400 p-1 hover:bg-white/5 rounded-lg transition-all"
              title="Deactivate Document Context"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Current Session Documents */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-2.5">
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">
            Session Documents
          </label>
          <span className="text-[9px] bg-emerald-950/40 text-emerald-400 border border-emerald-900/30 px-2 py-0.5 rounded-lg font-bold font-mono">
            Active Session
          </span>
        </div>
        
        {sessionDocuments && sessionDocuments.length > 0 ? (
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {sessionDocuments.map((doc) => (
              <div 
                key={doc.document_id} 
                className="flex items-center justify-between p-2.5 bg-[#16171e]/40 hover:bg-[#1c1d26] border border-white/5 hover:border-emerald-500/20 hover:scale-[1.01] rounded-xl text-xs transition-all duration-300 group shadow-sm"
              >
                <div className="flex items-center space-x-2 truncate">
                  <span className="text-gray-400 shrink-0 text-sm">📄</span>
                  <div className="truncate">
                    <p className="font-semibold text-gray-300 truncate max-w-[140px]" title={doc.document_name}>
                      {doc.document_name}
                    </p>
                    <p className="text-[9px] text-gray-500 font-mono">{doc.chunk_count} chunks indexed</p>
                  </div>
                </div>
                <button
                  onClick={() => onDeleteDocument(doc.document_id)}
                  className="text-gray-500 hover:text-rose-400 p-1.5 hover:bg-white/5 rounded-lg transition-all active:scale-95"
                  title="Remove Document from Session"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-gray-500 italic px-1">No documents uploaded to this session.</p>
        )}
      </div>

      {/* Chat History Sessions */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
          Chat Session History
        </label>
        
        {sessions.length === 0 ? (
          <div className="text-center py-8 text-xs text-gray-500 italic">
            No active conversations
          </div>
        ) : (
          <div className="space-y-1">
            {sessions.map((sess) => {
              const isSelected = sessionId === sess.id;
              return (
                <div
                  key={sess.id}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all duration-200 group cursor-pointer ${
                    isSelected 
                      ? 'bg-gradient-to-r from-[#1c1d26] to-[#252733] text-white border border-white/5 border-l-2 border-l-emerald-500 shadow-md scale-[1.01]' 
                      : 'hover:bg-[#16171f] text-gray-400 hover:text-gray-200 border-l-2 border-l-transparent hover:border-l-emerald-500/40'
                  }`}
                  onClick={() => onSelectSession(sess.id)}
                >
                  <div className="flex items-center space-x-2.5 truncate flex-1 mr-2">
                    <MessageSquare className={`w-4 h-4 shrink-0 transition-colors ${
                      isSelected ? 'text-emerald-400' : 'text-gray-500 group-hover:text-emerald-400'
                    }`} />
                    <span className={`truncate ${isSelected ? 'font-bold' : ''}`}>{sess.name}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Stop click propagating
                      onDeleteSession(sess.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 hover:text-rose-400 text-gray-500 p-1 hover:bg-white/5 rounded-md transition-all active:scale-95"
                    title="Delete Session"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Clear and Logout Panel */}
      <div className="p-4 border-t border-white/5 bg-black/20 flex flex-col space-y-2">
        {sessions.length > 0 && (
          <button
            onClick={onClearSessions}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-3 hover:bg-rose-950/20 border border-white/5 hover:border-rose-500/30 text-gray-400 hover:text-rose-400 rounded-xl text-xs font-bold hover:scale-[1.01] active:scale-[0.98] transition-all focus:outline-none"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center space-x-2 py-2.5 px-3 bg-white/5 hover:bg-zinc-800 border border-white/5 hover:border-zinc-700 text-gray-400 hover:text-white rounded-xl text-xs font-bold hover:scale-[1.01] active:scale-[0.98] transition-all focus:outline-none"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}

