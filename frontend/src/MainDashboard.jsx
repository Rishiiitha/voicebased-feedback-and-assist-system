import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  User, Mic, Home, MessageSquare, Settings, LogOut, Send, Square, Plus, PenSquare 
} from "lucide-react";
import "./MainDashboard.css";
import FeedbackTab from './FeedbackTab';

// --- Helper Functions ---
const getAuthToken = () => {
  const token = localStorage.getItem("access_token");
  if (!token) { handleLogout(); return null; }
  return token;
};
const handleLogout = () => {
  localStorage.removeItem("access_token");
  window.location.href = "/login";
};
const handleApiError = (res) => {
  if (res.status === 401 || res.status === 403) {
    alert("Session expired. Please log in again.");
    handleLogout();
    return true;
  }
  return false;
};
const speak = (text) => {
  const cleanText = text.replace(/\*/g, '');
  const utterance = new SpeechSynthesisUtterance(cleanText);
  window.speechSynthesis.speak(utterance);
};

// --- Speech API Setup (with error checking) ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
} else {
  console.log("Speech Recognition not supported in this browser.");
}
// --- (End of Helper Functions) ---


export default function MainDashboard({ userRole }) {
  // --- State ---
  const [tab, setTab] = useState("dashboard"); 
  const [darkMode, setDarkMode] = useState(true);
  const [rewardData, setRewardData] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]); // <-- This state was missing the welcome message
  const [input, setInput] = useState("");
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [abortController, setAbortController] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const chatWindowRef = useRef(null);

  // --- Data Fetching Effects ---

  // 1. Fetch dashboard data (rewards)
  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    fetch("http://127.0.0.1:8000/auth/reward-points", {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(async (res) => {
      if (handleApiError(res)) return null;
      if (!res.ok) throw new Error("Failed to fetch reward data");
      return res.json();
    })
    .then(data => {
      if (data) {
        setRewardData(data);
      }
      setLoadingData(false);
    })
    .catch(err => {
      console.error(err);
      setLoadingData(false);
    });
  }, []);

  // 2. Fetch all chat sessions when user clicks the "Chat" tab
  const fetchSessions = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;

    try {
      const res = await fetch("http://127.0.0.1:8000/auth/chat/sessions", {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (handleApiError(res)) return;
      const data = await res.json();
      if (data.sessions) {
        setSessions(data.sessions);
      }
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
    }
  }, []);

  // 3. Fetch messages for a specific session OR set welcome message
  useEffect(() => {
    const fetchHistory = async (sessionId) => {
      const token = getAuthToken();
      if (!token) return;
      setIsLoadingChat(true);
      try {
        const res = await fetch(`http://127.0.0.1:8000/auth/chat/history/${sessionId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (handleApiError(res)) return;
        const data = await res.json();
        const formattedHistory = data.history.map(msg => ({
          sender: msg.type === 'human' ? 'user' : 'bot',
          text: msg.data.content
        }));
        setMessages(formattedHistory);
      } catch (err) {
        console.error("Failed to fetch history:", err);
      } finally {
        setIsLoadingChat(false);
      }
    };

    if (currentSessionId) {
      // This is an existing session, load its history
      fetchHistory(currentSessionId);
    } else {
      // --- THIS IS THE FIX FOR THE WELCOME MESSAGE ---
      // This is a "New Chat", so set the default message
      setMessages([{ sender: 'bot', text: 'Hi! How can I help you today?' }]);
    }
  }, [currentSessionId]); // This effect re-runs when you switch sessions

  // 4. Auto-scroll chat window
  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages]);

  // 5. Apply dark mode
  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
  }, [darkMode]);

  // --- Chat Functions ---

  const handleSend = async (textToSubmit) => {
    const queryText = (typeof textToSubmit === 'string' ? textToSubmit : input).trim();
    if (!queryText) return;

    setIsLoadingChat(true);
    setInput("");
    setMessages(prev => [...prev, { sender: 'user', text: queryText }]);

    const controller = new AbortController();
    setAbortController(controller);
    const token = getAuthToken();
    if (!token) return;

    try {
      const res = await fetch("http://127.0.0.1:8000/bot/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          question: queryText,
          session_id: currentSessionId
        }),
        signal: controller.signal
      });

      if (handleApiError(res)) return;

      let botResponse = "";
      if (res.ok) {
        const data = await res.json();
        botResponse = data.answer;
        if (data.new_session_id) {
          setCurrentSessionId(data.new_session_id);
          fetchSessions(); // Refresh session list
        }
      } else {
        const errData = await res.json();
        botResponse = `Sorry, an error occurred: ${errData.detail}`;
      }
      
      setMessages(prev => [...prev, { sender: 'bot', text: botResponse }]);
      speak(botResponse);

    } catch (error) {
      if (error.name === 'AbortError') {
        setMessages(prev => [...prev, { sender: 'bot', text: "[Response stopped]" }]);
      } else {
        console.error("Failed to fetch:", error);
        setMessages(prev => [...prev, { sender: 'bot', text: "Sorry, I couldn't connect." }]);
      }
    }
    
    setIsLoadingChat(false);
    setAbortController(null);
  };

  const handleStopClick = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
  };

  // --- THIS IS THE FIX FOR THE MIC ---
  const handleListenClick = () => {
    if (!recognition) {
      alert("Speech recognition is not supported in your browser.");
      return;
    }
    if (isListening) return;

    recognition.onstart = () => {
      setIsListening(true);
    };

    // This now automatically sends the message
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      handleSend(transcript); // Automatically send the speech
    };

    // This now reports errors to the user
    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      let errorMsg = "An error occurred with the mic. Please try again.";
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        errorMsg = "Mic permission was denied. Please allow microphone access in your browser's site settings.";
      } else if (event.error === 'no-speech') {
        errorMsg = "No speech was detected. Please try again.";
      }
      // Add the error as a bot message
      setMessages(prev => [...prev, { sender: 'bot', text: errorMsg }]);
    };
    
    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };
  
  const handleNewChat = () => {
    setCurrentSessionId(null);
    setTab('voicebot');
  };
  const handleSessionClick = (sessionId) => {
    setCurrentSessionId(sessionId);
    setTab('voicebot');
  };
  // --- (End of Chat Functions) ---

  return (
    <div className="pd-wrapper">
      {/* Sidebar */}
      <aside className="pd-sidebar" aria-label="Sidebar">
        <div className="pd-sidebar-top">
          <div className="pd-avatar">
            <User size={20} />
          </div>
          <div className="pd-student">
            <div className="pd-name">{rewardData?.student_name || "Loading..."}</div>
            <div className="pd-roll">{rewardData?.roll_no || "..."}</div>
          </div>
        </div>

        <nav className="pd-nav" role="navigation">
          <button
            className={`pd-icon ${tab === "voicebot" ? "active" : ""}`}
            onClick={() => setTab("voicebot")}
            title="VoiceBot"
          >
            <Mic size={20} />
          </button>
          <button
            className={`pd-icon ${tab === "dashboard" ? "active" : ""}`}
            onClick={() => setTab("dashboard")}
            title="Dashboard"
          >
            <Home size={20} />
          </button>
          <button
            className={`pd-icon ${tab === "chat" ? "active" : ""}`}
            onClick={() => {
              setTab("chat");
              fetchSessions();
            }}
            title="Chats"
          >
            <MessageSquare size={20} />
          </button>
          <button
            className={`pd-icon ${tab === "feedback" ? "active" : ""}`}
            onClick={() => setTab("feedback")}
            title="Feedback"
          >
            <PenSquare size={20} />
          </button>
          <button
            className={`pd-icon ${tab === "settings" ? "active" : ""}`}
            onClick={() => setTab("settings")}
            title="Settings"
          >
            <Settings size={20} />
          </button>
          <button className="pd-icon logout" onClick={handleLogout} title="Logout">
            <LogOut size={20} />
          </button>
        </nav>
      </aside>

      {/* Main content */}
      <main className="pd-main">
        {/* VOICEBOT TAB */}
        {tab === "voicebot" && (
          <section className="pd-voicebot card">
            <h2 className="pd-title">Smart Voice Assistant</h2>

            <div className="pd-voice-area" ref={chatWindowRef}>
              {messages.map((msg, index) => (
                <div key={index} className={`msg ${msg.sender}`}>
                  {msg.text}
                </div>
              ))}
              {isLoadingChat && (
                <div className="msg bot loading">
                  <div className="typing-indicator">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              )}
              {isListening && (
                <div className="msg bot listening-indicator">
                  <Mic size={16} /> Listening...
                </div>
              )}
            </div>

            <div className="pd-voice-controls">
              <input
                className="pd-input"
                placeholder="Type or click mic to talk..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isLoadingChat && handleSend()}
                disabled={isLoadingChat}
              />
              {isLoadingChat ? (
                <button className="pd-mic-btn stop" onClick={handleStopClick} aria-label="Stop">
                  <Square size={18} />
                </button>
              ) : (
                <button
                  className={`pd-mic-btn ${isListening ? 'listening' : ''}`}
                  aria-label="Mic"
                  onClick={handleListenClick}
                  disabled={!recognition}
                >
                  <Mic size={18} />
                </button>
              )}
              <button className="pd-send-btn" onClick={() => handleSend()} disabled={isLoadingChat}>
                <Send size={16} />
              </button>
            </div>
          </section>
        )}

        {/* DASHBOARD TAB */}
        {tab === "dashboard" && (
          <section className="pd-dashboard card">
            <h2 className="pd-title">{userRole === 'parent' ? 'Parent' : 'Student'} Dashboard</h2>
            <p className="pd-sub">Welcome back, {rewardData?.student_name || 'User'}</p>
            <div className="pd-dashboard-grid">
              <div className="pd-left">
                <h3>Student Reward Points</h3>
                <div className="pd-points-grid">
                  <div className="pd-point-card">
                    <div className="label">MENTOR</div>
                    <div className="value">{loadingData ? "..." : rewardData?.mentor_name}</div>
                  </div>
                  <div className="pd-point-card">
                    <div className="label">CUMULATIVE POINTS</div>
                    <div className="value">{loadingData ? "..." : rewardData?.cumulative_reward_points}</div>
                  </div>
                  <div className="pd-point-card">
                    <div className="label">REDEEMED POINTS</div>
                    <div className="value">{loadingData ? "..." : rewardData?.redeemed_points}</div>
                  </div>
                  <div className="pd-point-card">
                    <div className="label">BALANCE POINTS</div>
                    <div className="value">{loadingData ? "..." : rewardData?.balance_points}</div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* CHAT HISTORY TAB */}
        {tab === "chat" && (
          <section className="pd-chat card wide">
             <div className="chat-header">
              <h2>Chat History</h2>
              <button className="pd-send-btn" onClick={handleNewChat}>
                <Plus size={16} /> New Chat
              </button>
            </div>
            <div className="chat-body">
              <aside className="chat-list">
                {sessions.length > 0 ? (
                  sessions.map((s) => (
                    <div
                      key={s.session_id}
                      className={`chat-card ${currentSessionId === s.session_id ? "selected" : ""}`}
                      onClick={() => handleSessionClick(s.session_id)}
                    >
                      <div className="chat-title">{s.title || "Untitled Chat"}</div>
                      <div className="chat-preview">
                        {new Date(s.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="chat-empty">
                    <div className="empty-title">No previous sessions</div>
                  </div>
                )}
              </aside>
              <div className="chat-window">
                 <div className="chat-empty">
                   <div className="empty-title">Select a chat to view</div>
                   <div className="empty-sub muted">Or start a new chat!</div>
                 </div>
              </div>
            </div>
          </section>
        )}
        
        {/* FEEDBACK TAB */}
        {tab === "feedback" && (
          <FeedbackTab />
        )}

        {/* SETTINGS TAB */}
        {tab === "settings" && (
          <section className="pd-settings card">
            <h2 className="pd-title">Settings</h2>
            <div className="settings-row">
              <label className="switch">
                <input
                  type="checkbox"
                  checked={darkMode}
                  onChange={() => setDarkMode((s) => !s)}
                />
                <span className="slider" />
                <span className="label">Dark Mode</span>
              </label>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}