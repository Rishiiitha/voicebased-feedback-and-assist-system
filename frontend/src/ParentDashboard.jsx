import React from 'react';
import MainDashboard from './MainDashboard';

function ParentDashboard() {
  // This component now just passes the 'parent' role
  return <MainDashboard userRole="parent" />;
}

export default ParentDashboard;