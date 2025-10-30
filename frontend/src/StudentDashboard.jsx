import React from 'react';
import MainDashboard from './MainDashboard';

function StudentDashboard() {
  // This component now just passes the 'student' role
  return <MainDashboard userRole="student" />;
}

export default StudentDashboard;