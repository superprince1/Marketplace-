import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminDashboard from '../components/Admin/AdminDashboard';
import LoadingSpinner from '../components/UI/LoadingSpinner';

/**
 * AdminPage Component
 * 
 * This component acts as a gatekeeper for the admin panel.
 * It checks if the user is authenticated and has admin privileges.
 * If not, it redirects to login or home.
 */
const AdminPage = () => {
  const { user, loading, isAuthenticated } = useAuth();

  // Show loading spinner while checking authentication
  if (loading) {
    return <LoadingSpinner message="Verifying admin credentials..." />;
  }

  // Not logged in – redirect to login page, remember where they came from
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: '/admin' }} replace />;
  }

  // Logged in but not admin – redirect to homepage
  if (!user.isAdmin && user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  // Authorized – render the admin dashboard
  return <AdminDashboard />;
};

export default AdminPage;