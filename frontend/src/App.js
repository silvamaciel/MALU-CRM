// src/App.jsx (ou App.js)
import React, { useState} from "react";
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
import OrigensAdminPage from './pages/Admin/OrigensAdminPage'; 
import DiscardReasonAdminPage from './pages/Admin/DiscardReasonAdminPage';


import LeadStageAdminPage from './pages/Admin/LeadStageAdminPage';


import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";


import "./App.css"; // Seus estilos globais

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    !!localStorage.getItem("userToken")
  );
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  const isAdmin = userData?.perfil === 'admin'; // Verifica se é admin

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    window.location.reload(); 
  };

  const handleLogout = () => {
    localStorage.removeItem("userToken");
    localStorage.removeItem("userData");
    setIsLoggedIn(false);
    window.location.href = '/login';
  };

  return (
    <Router>
      <div className="App">
        <ToastContainer position="top-right" autoClose={3000} theme="colored"/>

        {/* Botão Logout Simples (visível se logado) */}
        {isLoggedIn && (
             <button onClick={handleLogout} style={{ position: 'fixed', top: '10px', right: '10px', zIndex: 1000, padding: '5px 10px', cursor: 'pointer'}}>
                 Logout ({userData?.nome || 'Usuário'}) {/* Mostra nome se disponível */}
             </button>
         )}

        <main>
          <Routes>
            {/* Rota de Login */}
            <Route
                path="/login"
                element={
                  !isLoggedIn ? ( <LoginPage onLoginSuccess={handleLoginSuccess} /> )
                   : ( <Navigate replace to="/leads" /> ) /* Redireciona se já logado */
                }
            />
            {/* Rota /login duplicada foi REMOVIDA daqui */}

            {/* Rotas Protegidas Comuns */}
            <Route
                path="/leads"
                element={ isLoggedIn ? <LeadListPage /> : <Navigate replace to="/login" /> }
            />
            <Route
                path="/leads/novo"
                element={ isLoggedIn ? <LeadFormPage /> : <Navigate replace to="/login" /> }
            />
             <Route
                path="/leads/:id"
                element={ isLoggedIn ? <LeadDetailPage /> : <Navigate replace to="/login" /> }
             />
             <Route
                path="/leads/:id/editar"
                element={ isLoggedIn ? <LeadFormPage /> : <Navigate replace to="/login" /> }
             />

            {/* <<< Rota Adicionada para Admin de Situações >>> */}
            <Route
                path="/admin/situacoes"
                element={
                    isLoggedIn ? // 1. Logado?
                        (isAdmin ? // 2. É admin?
                            <LeadStageAdminPage /> // Sim -> Mostra página
                        : <Navigate replace to="/leads" /> // Não é admin -> Vai para leads
                        )
                    : <Navigate replace to="/login" /> // Não logado -> Vai para login
                }
            />
            <Route
              path="/admin/origens"
              element={ isLoggedIn && isAdmin ? <OrigensAdminPage /> : <Navigate replace to={isLoggedIn ? "/leads" : "/login"} /> }
          />
          <Route
                path="/admin/motivosdescarte"
                element={ isLoggedIn && isAdmin ? <DiscardReasonAdminPage /> : <Navigate replace to={isLoggedIn ? "/leads" : "/login"} /> }
            />


             {/* Rota Raiz e Rota 404 */}
            <Route
                path="/"
                element={ <Navigate replace to={isLoggedIn ? "/leads" : "/login"} /> }
            />
            <Route
                path="*"
                element={ <div><h1>404 - Página Não Encontrada</h1></div> }
            />
          </Routes>
        </main>

      </div>
    </Router>
  );
}

export default App;
