// src/App.jsx (ou App.js)
import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import LeadListPage from "./pages/LeadList/LeadListPage";
import LeadFormPage from "./pages/LeadForm/LeadFormPage";
import LeadDetailPage from "./pages/LeadDatail/LeadDetailPage";
import LoginPage from "./pages/Login/LoginPage";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Importar outras páginas aqui quando criadas
// import LeadFormPage from './pages/LeadForm/LeadFormPage';

import "./App.css"; // Seus estilos globais

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    !!localStorage.getItem("userToken")
  );

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    // Opcional: forçar navegação para /leads se já não estiver lá
    // window.location.href = '/leads'; // Ou usar navigate se disponível aqui
  };

  // Função de Logout (exemplo básico)
  const handleLogout = () => {
    localStorage.removeItem("userToken");
    localStorage.removeItem("userData");
    setIsLoggedIn(false);
    // Redireciona para login
    // window.location.href = '/login'; // Ou use navigate
  };

  return (
    <Router>
      {/* Pode adicionar um Layout global aqui (Navbar, Sidebar) se desejar */}
      <div className="App">
        <ToastContainer
          position="top-right" // Posição na tela
          autoClose={3000} // Fecha automaticamente após 3 segundos
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored" // Ou "light", "dark"
        />

        <main>
          
          <Routes>
          <Route
            path="/login"
            element={
              !isLoggedIn ? (
                <LoginPage onLoginSuccess={handleLoginSuccess} />
              ) : (
                <Navigate replace to="/leads" />
              )
            }
          />
            <Route
              path="/login"
              element={
                !isLoggedIn ? (
                  <LoginPage onLoginSuccess={handleLoginSuccess} />
                ) : (
                  <Navigate replace to="/leads" />
                )
              }
            />

            {/* Rotas Protegidas (Exemplo Básico) */}
            <Route
              path="/leads"
              element={
                isLoggedIn ? <LeadListPage /> : <Navigate replace to="/login" />
              }
            />
            <Route
              path="/leads/novo"
              element={
                isLoggedIn ? <LeadFormPage /> : <Navigate replace to="/login" />
              }
            />
            <Route
              path="/leads/:id"
              element={
                isLoggedIn ? (
                  <LeadDetailPage />
                ) : (
                  <Navigate replace to="/login" />
                )
              }
            />
            <Route
              path="/leads/:id/editar"
              element={
                isLoggedIn ? <LeadFormPage /> : <Navigate replace to="/login" />
              }
            />

            {/* Rota Raiz e Rota 404 */}
            <Route
              path="/"
              element={
                <Navigate replace to={isLoggedIn ? "/leads" : "/login"} />
              }
            />
            <Route
              path="*"
              element={
                <div>
                  <h1>404 - Página Não Encontrada</h1>
                </div>
              }
            />
          </Routes>
        </main>
        <button
          onClick={handleLogout}
          style={{ position: "fixed", top: "10px", right: "10px", zIndex: 100 }}
        >
          Logout
        </button>
      </div>
    </Router>
  );
}

export default App;
