// src/components/Auth/AdminGuard.js
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

function AdminGuard({ isAdmin }) {
    console.log("AdminGuard - isAdmin:", isAdmin);

    if (isAdmin === undefined || isAdmin === null) {
          console.warn("AdminGuard: Status de admin desconhecido, redirecionando.");
         return <Navigate to="/dashboard" replace />;
    }
    return isAdmin ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

export default AdminGuard;