import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
    const { authToken } = useContext(AuthContext);

    if (!authToken) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtectedRoute;