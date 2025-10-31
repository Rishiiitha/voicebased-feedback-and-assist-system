import React, { useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate
} from 'react-router-dom';

// --- 1. IMPORT ALL YOUR PAGE COMPONENTS ---
import Dashboard from './Dashboard.jsx'; // Your new default landing page
import Login from './Login.jsx';
import MainDashboard from './MainDashboard.jsx'; // The Parent/Student UI
import AdminDashboard from './AdminDashboard.jsx';
import DepartmentDashboard from './DepartmentDashboard.jsx';
import IntroPage from './IntroPage.jsx'; // The "magical" page

function App() {
  const [selectedRole, setSelectedRole] = useState(null);

  // --- 2. WRAPPER COMPONENTS ---

  // This HomeWrapper renders your new default page (Dashboard.jsx)
  function HomeWrapper() {
    const navigate = useNavigate();

    // This function now handles all clicks from Dashboard.jsx
    const handleNavigate = (action) => {
      if (action === "user") {
        // "Get Started" button -> Go to IntroPage
        navigate("/intro"); 
      } else {
        // "Login" or "Signup" button
        setSelectedRole(action); // 'action' will be 'login' or 'signup'
        navigate("/login");
      }
    };

    return <Dashboard onNavigateToLogin={handleNavigate} />;
  }

  // Login page
  function LoginWrapper() {
    const navigate = useNavigate();
    const handleBack = () => {
      setSelectedRole(null);
      navigate('/'); // Navigate back to the new default page
    };
    return <Login selectedRole={selectedRole} onBack={handleBack} />;
  }

  // --- 3. ROUTER SETUP ---
  return (
    <Router>
      <Routes>
        {/* --- THIS IS THE FIX --- */}
        {/* 1. Dashboard.jsx is now the default page at "/" */}
        <Route path="/" element={<HomeWrapper />} />

        {/* 2. The "magical" intro page is now at "/intro" */}
        <Route path="/intro" element={<IntroPage />} />
        
        {/* --- Your Existing Routes --- */}
        <Route path="/login" element={<LoginWrapper />} />
        
        {/* Dashboards for logged-in users */}
        <Route path="/parent-dashboard" element={<MainDashboard userRole="parent" />} />
        <Route path="/student-dashboard" element={<MainDashboard userRole="student" />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/department-dashboard" element={<DepartmentDashboard />} />

        {/* Fallback Route: Send all unknown URLs back to the home page */}
        <Route path="*" element={<HomeWrapper />} />
      </Routes>
    </Router>
  );
}

export default App;