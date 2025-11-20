import React, { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import './ProtectedRoute.css';

interface ProtectedRouteProps {
  children: ReactNode;
  onRedirectToLogin?: () => void;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, onRedirectToLogin }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="protected-route-loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login
    if (onRedirectToLogin) {
      onRedirectToLogin();
    }
    return (
      <div className="protected-route-unauthorized">
        <div className="unauthorized-card">
          <h2>Authentication Required</h2>
          <p>Please log in to access this page.</p>
          <button onClick={onRedirectToLogin} className="login-redirect-btn">
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
