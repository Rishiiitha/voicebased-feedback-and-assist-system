import React, { useState } from 'react';
import { Mic, Send, Square } from 'lucide-react';
import './FeedbackTab.css'; // We'll keep using this CSS file

// --- Helper Functions ---
const getAuthToken = () => {
  const token = localStorage.getItem("access_token");
  if (!token) {
    window.location.href = '/login'; 
    return null;
  }
  return token;
};

const handleLogout = () => {
  localStorage.removeItem("access_token");
  window.location.href = '/login';
};

const handleApiError = (res) => {
  if (res.status === 401 || res.status === 403) {
    alert("Session expired. Please log in again.");
    handleLogout();
    return true;
  }
  return false;
};

// --- Speech API Setup (Copied from MainDashboard) ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
} else {
  console.log("Speech Recognition not supported in this browser.");
}

function FeedbackTab() { 
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | success | error
  const [responseMsg, setResponseMsg] = useState("Send your feedback, complaint, or query directly to the concerned department.");
  const [isListening, setIsListening] = useState(false); // <-- 1. ADDED STATE
  
  const sendFeedback = async (feedbackText) => {
    if (!feedbackText.trim()) return;

    setStatus("sending");
    setMessage(""); // Clear input
    const token = getAuthToken();
    if (!token) return;

    try {
      const res = await fetch("http://127.0.0.1:8000/bot/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ question: feedbackText }),
      });

      if (handleApiError(res)) throw new Error("Auth error");
      
      const data = await res.json();
      
      if (res.ok) {
        setStatus("success");
        setResponseMsg(data.answer);
      } else {
        throw new Error(data.detail || "An error occurred.");
      }
    } catch (error) {
      console.error("Failed to send feedback:", error);
      setStatus("error");
      setResponseMsg(`Error: ${error.message}`);
    }
    
    // Reset status to idle after a moment
    setTimeout(() => setStatus("idle"), 4000);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    sendFeedback(message);
  };

  // --- 2. UPDATED: handleListenClick (with error handling) ---
  const handleListenClick = () => {
    if (!recognition) {
        alert("Speech recognition is not supported in your browser.");
        return;
    }
    if (isListening || status === 'sending') return;

    recognition.onstart = () => {
      setIsListening(true);
      setStatus("sending"); // Show loading state
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setMessage(transcript); // Put speech in box
      sendFeedback(transcript); // Automatically send
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      let errorMsg = "An error occurred with the mic. Please try again.";
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        errorMsg = "Mic permission was denied. Please allow microphone access in your browser's site settings.";
      } else if (event.error === 'no-speech') {
        errorMsg = "No speech was detected. Please try again.";
      }
      setStatus("error");
      setResponseMsg(errorMsg);
    };
    
    recognition.onend = () => {
      setIsListening(false);
      // Don't reset status here, wait for sendFeedback to finish
    };

    recognition.start();
  };

  return (
    <section className="pd-settings card">
      <h2 className="pd-title">Feedback & Support</h2>
      
      <div className="feedback-response-area" style={{ margin: 0, minHeight: '100px' }}>
        {/* --- 3. ADDED: Show "Listening..." indicator --- */}
        {isListening ? (
          <p className="feedback-response listening">
            <Mic size={16} /> Listening...
          </p>
        ) : (
          <p className={`feedback-response ${status}`}>{responseMsg}</p>
        )}
      </div>

      <form onSubmit={handleFormSubmit} className="feedback-controls" style={{ marginTop: '20px' }}>
        <input
          className="feedback-input"
          placeholder="Type your feedback here..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={status === 'sending'}
        />
        <button
          type="button"
          // --- 4. UPDATED: Button is now styled and disabled correctly ---
          className={`feedback-mic-btn ${isListening ? 'listening' : ''}`}
          aria-label="Mic"
          onClick={handleListenClick}
          disabled={!recognition || status === 'sending'}
        >
          <Mic size={18} />
        </button>
        <button 
          type="submit" 
          className="feedback-send-btn" 
          disabled={status === 'sending' || !message.trim()}
        >
          {status === 'sending' ? "..." : <Send size={16} />}
        </button>
      </form>
    </section>
  );
}

export default FeedbackTab;