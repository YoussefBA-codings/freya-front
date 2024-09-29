import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

const isAuthenticated = (): boolean => {
  return localStorage.getItem('isAuthenticated') === 'true';
};

interface PrivateRouteProps {
  children: ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  return isAuthenticated() ? <>{children}</> : <Navigate to="/login" />;
};

export default PrivateRoute;
