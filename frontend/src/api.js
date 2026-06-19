import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Setup Axios client
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach Bearer JWT token automatically
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('rag_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export const signupUser = async (username, password) => {
  const response = await apiClient.post('/signup', { username, password });
  return response.data;
};

export const loginUser = async (username, password) => {
  const params = new URLSearchParams();
  params.append('username', username);
  params.append('password', password);
  
  const response = await apiClient.post('/login', params, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });
  return response.data;
};

export const checkHealth = async () => {
  const response = await apiClient.get('/health');
  return response.data;
};

export const uploadDocument = async (file, sessionId = null) => {
  const formData = new FormData();
  formData.append('file', file);
  if (sessionId) {
    formData.append('session_id', sessionId);
  }
  
  const response = await apiClient.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const fetchSessionDocuments = async (sessionId) => {
  const response = await apiClient.get(`/session/${sessionId}/documents`);
  return response.data;
};

export const deleteDocument = async (documentId) => {
  const response = await apiClient.delete(`/document/${documentId}`);
  return response.data;
};

export const fetchSessions = async () => {
  const response = await apiClient.get('/sessions');
  return response.data;
};

export const fetchSessionHistory = async (sessionId) => {
  const response = await apiClient.get(`/history/${sessionId}`);
  return response.data;
};

export const deleteSession = async (sessionId) => {
  const response = await apiClient.delete(`/session/${sessionId}`);
  return response.data;
};

export const fetchAdminStats = async () => {
  const response = await apiClient.get('/admin/stats');
  return response.data;
};

/**
 * Handles async POST streaming of RAG queries using raw fetch and ReadableStream reader.
 * Necessary because EventSource does not support POST requests or custom Headers.
 */
export const queryStream = async (
  question, 
  sessionId, 
  globalSearch,
  onToken, 
  onSources, 
  onError, 
  onDone,
  onTrace,
  onDecision,
  onConfidence
) => {
  const token = localStorage.getItem('rag_token');
  
  try {
    const response = await fetch(`${API_BASE_URL}/agent/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify({
        question,
        session_id: sessionId,
        global_search: globalSearch
      })
    });
    
    if (!response.ok) {
      const errText = await response.text();
      let errParsed;
      try {
        errParsed = JSON.parse(errText);
      } catch {
        errParsed = { detail: errText };
      }
      throw new Error(errParsed.detail || "Query execution failed.");
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop(); // save trailing partial line in buffer
      
      for (const line of lines) {
        let trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed.startsWith("data: ")) {
          trimmed = trimmed.substring(6).trim();
        }
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed.type === "sources") {
            if (onSources) onSources(parsed.data);
          } else if (parsed.type === "content") {
            if (onToken) onToken(parsed.data);
          } else if (parsed.type === "decision") {
            if (onDecision) onDecision(parsed.data);
          } else if (parsed.type === "trace") {
            if (onTrace) onTrace(parsed.data);
          } else if (parsed.type === "confidence") {
            if (onConfidence) onConfidence(parsed.data);
          } else if (parsed.type === "done") {
            if (onDone) onDone();
          }
        } catch (e) {
          console.error("Failed to parse stream line:", line, e);
        }
      }
    }
  } catch (err) {
    onError(err);
  }
};

export const exportSession = async (sessionId, format) => {
  const response = await apiClient.get(`/export/session/${sessionId}?format=${format}`, {
    responseType: 'blob'
  });
  return response.data;
};

export const speakText = async (text) => {
  const response = await apiClient.post('/voice/speak', { text }, {
    responseType: 'blob'
  });
  return response.data;
};

export const transcribeSpeech = async (audioBlob) => {
  const formData = new FormData();
  formData.append('file', audioBlob, 'recording.wav');
  const response = await apiClient.post('/voice/transcribe', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

export const fetchEduContent = async (sessionId, contentType, difficulty, count = 5) => {
  const response = await apiClient.get(`/edu/generate?session_id=${sessionId}&content_type=${contentType}&difficulty=${difficulty}&count=${count}`);
  return response.data;
};

export const fetchGraphPath = async (sessionId, source, target) => {
  const response = await apiClient.get(`/agent/graph/path?session_id=${sessionId}&source=${source}&target=${target}`);
  return response.data;
};

export const fetchGraphData = async (sessionId) => {
  const response = await apiClient.get(`/agent/graph/data?session_id=${sessionId}`);
  return response.data;
};
