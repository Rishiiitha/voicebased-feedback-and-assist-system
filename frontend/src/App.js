import React, { useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate
} from 'react-router-dom';

// --- 1. IMPORT ALL YOUR PAGE COMPONENTS ---
import Dashboard from './Dashboard.jsx'; // Your landing/role selection page
import Login from './Login.jsx';
import MainDashboard from './MainDashboard.jsx'; // Your new Parent/Student UI
import AdminDashboard from './AdminDashboard.jsx';
import DepartmentDashboard from './DepartmentDashboard.jsx';
import IntroPage from './IntroPage.jsx';
import FeedbackTab from './FeedbackTab.jsx'; // The component, not a page

function App() {
  const [selectedRole, setSelectedRole] = useState(null);

  // --- 2. WRAPPER COMPONENTS ---

  // Home (Landing page) - This seems to be your IntroPage now
  // I will route "/" to IntroPage instead
  
  // Role Selection Page (This might be your old "Dashboard.jsx")
  function RoleWrapper() {
    const navigate = useNavigate();
    const handleRoleSelect = (role) => {
      setSelectedRole(role);
      navigate('/login'); 
    };
    return <Dashboard onNavigateToLogin={handleRoleSelect} />;
  }

  // Login page
  function LoginWrapper() {
    const navigate = useNavigate();
    const handleBack = () => {
      setSelectedRole(null);
      navigate('/'); // Navigate back to the Intro page
    };
    return <Login selectedRole={selectedRole} onBack={handleBack} />;
  }

  // --- 3. ROUTER SETUP ---
  return (
    <Router>
      <Routes>
        {/* Main Landing Page */}
        <Route path="/" element={<IntroPage />} />

        {/* Page to select role (if you still use it) */}
        <Route path="/select-role" element={<RoleWrapper />} />

        {/* Login Page */}
        <Route path="/login" element={<LoginWrapper />} />

        {/* --- Dashboard Routes (MUST match Login.jsx redirects) --- */}
        <Route 
          path="/parent-dashboard" 
          element={<MainDashboard userRole="parent" />} 
        />
        <Route 
          path="/student-dashboard" 
          element={<MainDashboard userRole="student" />} 
        />
        <Route 
          path="/admin-dashboard" 
          element={<AdminDashboard />} 
        />
        <Route 
          path="/department-dashboard" 
          element={<DepartmentDashboard />} 
        />

        {/* This route is no longer needed as a page */}
        {/* <Route path="/feedback" element={<FeedbackTab />} /> */}

        {/* Fallback Route: Send all unknown URLs to the intro page */}
        <Route path="*" element={<IntroPage />} />
      </Routes>
    </Router>
  );
}

export default App;