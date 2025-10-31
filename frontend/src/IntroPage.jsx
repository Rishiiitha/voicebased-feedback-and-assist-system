import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom'; // <-- 1. Import useNavigate
import "./intro.css"; // Make sure this file exists

const ROLE_DATA = [
  {
    role: "Parent",
    icon: "👨‍👩‍👧",
    description: "Track your child’s academic and financial progress.",
    details: ["Fee Status", "Attendance", "Performance Reports"],
  },
  {
    role: "Student",
    icon: "🎓",
    description: "Access personalized learning resources and support.",
    details: ["Courses", "Assignments", "AI Voice Support"],
  },
];

const FEATURES = [
  { icon: "🎙️", title: "AI Voice Query", desc: "Ask anything — instant answers through natural conversation." },
  { icon: "🏫", title: "Department Routing", desc: "Smartly directs your query to the right department." },
  { icon: "🍽️", title: "Mess Feedback", desc: "Send feedback directly to the food department instantly." },
  { icon: "🧹", title: "Cleaning Requests", desc: "Raise cleanliness or hostel issues quickly via voice." },
  { icon: "🚌", title: "Transport Queries", desc: "Get real-time updates about routes and schedules." },
];

const TEAM = [
  { name: "Kavinkumar", role: "AI & Backend", desc: "Builds the core agentic system and routing logic." },
  { name: "Rishitha", role: "Frontend Designer", desc: "Creates the elegant magical interface design." },
  { name: "Amirtha", role: "Data Engineer", desc: "Manages voice data and response integration." },
  { name: "Malaravan", role: "Audio Systems", desc: "Handles speech synthesis and audio integration." },
];

function IntroPage() { 
  const [rating, setRating] = useState(0);
  const [stats, setStats] = useState({ queries: 0, accuracy: 0, uptime: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setStats({
        queries: Math.min(10000, i * 500),
        accuracy: Math.min(99, i * 5),
        uptime: Math.min(24, i),
      });
      if (i >= 20) clearInterval(interval);
    }, 100);
  }, []);

  const handleLogin = () => {
    // This now goes to your role selection page
    navigate('/select-role'); 
  };
  
  const handleSubmitFeedback = () => {
    alert("Feedback submitted (demo)!");
  };

  return (
    <div className="main-dashboard-wrapper">
      {/* Floating Magical Orbs */}
      <div className="floating-orbs">
        <div className="orb orb1"></div>
        <div className="orb orb2"></div>
        <div className="orb orb3"></div>
      </div>

      {/* Header */}
      <header className="magic-header">
        <div className="logo">✨ <span>VoiceBot Dashboard</span></div>
        <div className="nav-buttons">
          <button className="nav-btn login" onClick={handleLogin}>Login</button>
          <button className="nav-btn signup" onClick={handleLogin}>Sign Up</button>
        </div>
      </header>

      {/* About Section */}
      <section className="about-section">
        <h2 className="section-title">About VoiceBot</h2>
        <p className="about-text">
          VoiceBot is an AI-powered campus assistant that connects students, parents, 
          and departments through natural voice interaction, making communication effortless and instant. 
          It also includes a smart feedback system that routes mails automatically to respective departments 
          like Food, Hostel, and Cleaning.
        </p>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2 className="section-title">Core Features</h2>
        <div className="feature-grid">
          {FEATURES.map((f, i) => (
            <div key={i} className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Statistics Section */}
      <section className="stats-section">
        <div className="stat-card">
          <h3>{stats.queries.toLocaleString()}+</h3>
          <p>Queries Processed</p>
        </div>
        <div className="stat-card">
          <h3>{stats.accuracy}%</h3>
          <p>Routing Accuracy</p>
        </div>
        <div className="stat-card">
          <h3>{stats.uptime}/7</h3> 
          <p>Active Hours</p>
        </div>
      </section>

      {/* Role Section */}
      <main className="dashboard-main">
        <h2 className="section-title">Personalized Space</h2>
        <div className="role-cards">
          {ROLE_DATA.map((role, index) => (
            <div key={index} className="magic-card" onClick={handleLogin}>
              <div className="role-icon">{role.icon}</div>
              <h3>{role.role}</h3>
              <p>{role.description}</p>
              <ul>
                {role.details.map((item, i) => (
                  <li key={i}>• {item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Feedback Section */}
        <div className="feedback-section">
          <h3 className="section-title">Share Your Feedback</h3>
          <p className="feedback-text">
            We’d love to hear your thoughts about your experience!
          </p>
          <div className="star-rating">
            {[1, 2, 3, 4, 5].map((num) => (
              <span
                key={num}
                className={`star ${rating >= num ? "active" : ""}`}
                onClick={() => setRating(num)}
              >
                ★
              </span>
            ))}
          </div>
          <textarea
            className="feedback-input"
            placeholder="Type your feedback here..."
          ></textarea>
          <button className="submit-btn" onClick={handleSubmitFeedback}>
            Submit Feedback
          </button>
        </div>
      </main>

      {/* Team Section */}
      <section className="team-section">
        <h2 className="section-title">Meet Our Team</h2>
        <div className="team-grid">
          {TEAM.map((member, i) => (
            <div key={i} className="team-card">
              <div className="avatar">{member.name.charAt(0)}</div>
              <h3>{member.name}</h3>
              <p className="team-role">{member.role}</p>
              {/* --- THIS IS THE FIX --- */}
              <p className="team-desc">{member.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact Section */}
      <section className="contact-section">
        <h2 className="section-title">Contact Us</h2>
        <p className="contact-text">
          Need help? Reach us at <span>F4@gmail.com</span>
        </p>
      </section>

      {/* Footer */}
      <footer className="dashboard-footer">
        © 2025 VoiceBot AI | Designed with 💙 by Audio Team
      </footer>
    </div>
  );
};

export default IntroPage;