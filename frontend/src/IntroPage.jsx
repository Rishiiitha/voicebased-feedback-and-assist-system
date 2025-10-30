import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom'; // <-- 1. Import useNavigate
import "./intro.css";

// (ROLE_DATA, FEATURES, TEAM constants are all the same)
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
  { name: "Kavinkumar", role: "Frontend Designer", desc: "Creates the elegant magical interface design" },
  { name: "Rishitha", role: "AI & Backend", desc: "Does the job of connecting Backend with DB" },
  { name: "Amirtha", role: "Data Engineer", desc: "Manages voice data and response integration." },
  { name: "Malaravan", role: "System connection", desc: "Does the Job of integrating Backend with Twilio to send SMS" },
];

// 2. Rename component to IntroPage
function IntroPage() {
  const [rating, setRating] = useState(0);
  const [stats, setStats] = useState({ queries: 0, accuracy: 0, uptime: 0 });
  const navigate = useNavigate(); // <-- 3. Initialize navigate

  useEffect(() => {
    // (Your stats interval effect is fine)
  }, []);

  // --- 4. Add Navigation Handlers ---
  const handleLogin = () => {
    navigate('/login'); // Or '/select-role' if that's your role page
  };
  
  const handleGetStarted = () => {
    navigate('/feedback'); // This links to your new page
  };

  return (
    <div className="main-dashboard-wrapper">
      {/* (Floating orbs are fine) */}
      <div className="floating-orbs">...</div>

      {/* 5. Wire up Header Buttons */}
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
          VoiceBot is an AI-powered campus assistant...
        </p>
        
        {/* --- 6. ADDED "GET STARTED" BUTTON --- */}
        <button className="submit-btn get-started-btn" onClick={handleGetStarted}>
          Get Started & Give Feedback
        </button>
      </section>

      {/* (Features Section is fine) */}
      <section className="features-section">...</section>

      {/* (Stats Section is fine) */}
      <section className="stats-section">...</section>

      {/* Role Section */}
      <main className="dashboard-main">
        <h2 className="section-title">Select Your Role</h2>
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

        {/* (Feedback Section is fine, but it's a non-functional demo) */}
        <div className="feedback-section">...</div>
      </main>

      {/* (Team Section is fine) */}
      <section className="team-section">...</section>

      {/* (Contact Section is fine) */}
      <section className="contact-section">...</section>

      {/* (Footer is fine) */}
      <footer className="dashboard-footer">...</footer>
    </div>
  );
};

// 7. Update export name
export default IntroPage;