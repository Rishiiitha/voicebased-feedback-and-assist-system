import React, { useState } from 'react';
import { Mic, Send, Square } from 'lucide-react';
import './FeedbackTab.css'; // We can keep using the same CSS

// --- Helper Functions (Copied from your other files) ---
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

// --- Speech API Setup ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
}

// Renamed to FeedbackTab
function FeedbackTab() { 
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | success | error
  const [responseMsg, setResponseMsg] = useState("Send your feedback, complaint, or query directly to the concerned department.");
  const [isListening, setIsListening] = useState(false);
  
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
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    sendFeedback(message);
  };

  const handleListenClick = () => {
    if (!recognition || isListening) return;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setMessage(transcript);
      sendFeedback(transcript); // Automatically send after speech
    };
    recognition.onerror = (event) => console.error("Speech error", event.error);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  // This is the new, simpler JSX that fits inside your dashboard
  return (
    <section className="pd-settings card"> {/* Re-using 'pd-settings' style */}
      <h2 className="pd-title">Feedback & Support</h2>
      
      <div className="feedback-response-area" style={{ margin: 0, minHeight: '100px' }}>
        <p className={`feedback-response ${status}`}>{responseMsg}</p>
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