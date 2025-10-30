import React, { useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate
} from 'react-router-dom';

// --- 1. IMPORT ALL YOUR PAGE COMPONENTS ---
import Dashboard from './Dashboard.jsx'; // Landing page
import Login from './Login.jsx';
import ParentDashboard from './ParentDashboard.jsx';
import AdminDashboard from './AdminDashboard.jsx';
import StudentDashboard from './StudentDashboard.jsx'; // Student main page
import MainDashboard from './MainDashboard.jsx'; // Get Started -> Main Dashboard
import Feedback from './FeedbackTab.jsx'; // NEW FEEDBACK PAGE

function App() {
  const [selectedRole, setSelectedRole] = useState(null);

  // --- 2. WRAPPER COMPONENTS ---

  // Home (Landing page)
  function HomeWrapper() {
    const navigate = useNavigate();

    const handleRoleSelect = (page) => {
      if (page === "user") {
        navigate("/main-dashboard");
      } else {
        setSelectedRole(page);
        navigate("/login");
      }
    };

    return <Dashboard onNavigateToLogin={handleRoleSelect} />;
  }

  // Login page
  function LoginWrapper() {
    const navigate = useNavigate();

    const handleBack = () => {
      setSelectedRole(null);
      navigate('/');
    };

    return <Login selectedRole={selectedRole} onBack={handleBack} />;
  }

  // --- 3. ROUTER SETUP ---
  return (
    <Router>
      <Routes>
        {/* Main Landing Page */}
        <Route path="/" element={<HomeWrapper />} />

        {/* Login Page */}
        <Route path="/login" element={<LoginWrapper />} />

        {/* --- Dashboard Routes --- */}
        <Route path="/parent-dashboard" element={<ParentDashboard />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/dashboard" element={<StudentDashboard />} />

        {/* ✅ New Feedback Route */}
        <Route path="/feedback" element={<Feedback />} />

        {/* ✅ Main Dashboard (Get Started page) */}
        <Route path="/main-dashboard" element={<MainDashboard />} />

        {/* Fallback Route */}
        <Route path="*" element={<HomeWrapper />} />
      </Routes>
    </Router>
  );
}

export default App;