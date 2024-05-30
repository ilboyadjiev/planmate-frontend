import React, { useContext } from 'react';
import { Route, Navigate } from 'react-router-dom';
import { AuthContext } from './AuthContext';

const ProtectedRoute = ({ element: Component, ...rest }) => {
    const { authToken } = useContext(AuthContext);

    return (
        <Route 
            {...rest} 
            element={authToken ? <Component /> : <Navigate to="/login" replace />}
        />
    );
};

export default ProtectedRoute;
