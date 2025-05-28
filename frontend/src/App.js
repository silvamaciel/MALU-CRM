// src/App.jsx (ou App.js)
import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Link
} from "react-router-dom";

// Pages & Layout
import LeadListPage from "./pages/LeadList/LeadListPage";
import LeadFormPage from "./pages/LeadForm/LeadFormPage";
import LeadDetailPage from "./pages/LeadDatail/LeadDetailPage";
import LoginPage from "./pages/Login/LoginPage";
import DashboardPage from './pages/Dashboard/DashboardPage';
import LeadStageAdminPage from './pages/Admin/LeadStageAdminPage';
import OrigensAdminPage from './pages/Admin/OrigensAdminPage';
import DiscardReasonAdminPage from './pages/Admin/DiscardReasonAdminPage';
import UsuariosAdminPage from './pages/Admin/UsuariosAdminPage';
import MainLayout from './components/Layout/MainLayout';
import BrokerContactsAdminPage from './pages/Admin/BrokerContactsAdminPage';
import AdminGuard from './components/Auth/AdminGuard';
import IntegrationsPage from './pages/Integrations/IntegrationsPage'; 
import EmpreendimentoListPage from './pages/Empreendimento/EmpreendimentoListPage/EmpreendimentoListPage';
import EmpreendimentoFormPage from './pages/Empreendimento/EmpreendimentoFormPage/EmpreendimentoFormPage';
import EmpreendimentoDetailPage from './pages/Empreendimento/EmpreendimentoDetailPage/EmpreendimentoDetailPage';
import UnidadeFormPage from './pages/Empreendimento/UnidadeFormPage/UnidadeFormPage';
import ReservaListPage from './pages/Empreendimento/Reserva/ReservaListPage/ReservaListPage';
import ModeloContratoListPage from './pages/Admin/ModeloContrato/ModeloContratoListPage/ModeloContratoListPage';




// Libs & CSS
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    !!localStorage.getItem("userToken")
  );
  const [userData, setUserData] = useState(JSON.parse(localStorage.getItem('userData') || '{}'));
  const isAdmin = userData?.perfil === 'admin';

  // Chamado pelo LoginPage para atualizar o estado após sucesso
  const handleLoginSuccess = () => {
    // Re-lê do localStorage caso tenha sido atualizado pela API de login
    setUserData(JSON.parse(localStorage.getItem('userData') || '{}'));
    setIsLoggedIn(true);
    // O Navigate na rota cuidará do redirecionamento
  };

  // Chamado pelo Sidebar/MainLayout
  const handleLogout = () => {
    localStorage.removeItem("userToken");
    localStorage.removeItem("userData");
    setUserData({});
    setIsLoggedIn(false);
  };

  return (
    <Router>
      <ToastContainer position="top-right" autoClose={3000} theme="colored"/>
      {/* Classe App pode ser removida se o layout for controlado por MainLayout */}
      {/* <div className="App"> */}
        <Routes>
          {/* Rota de Login (Fora do Layout Principal) */}
          <Route
              path="/login"
              element={
                !isLoggedIn ? ( <LoginPage onLoginSuccess={handleLoginSuccess} /> )
                 : ( <Navigate replace to="/dashboard" /> ) // Logado? Vai pro dashboard
              }
          />

          {/* --- Rotas Protegidas QUE USAM o MainLayout --- */}
          <Route
              path="/" // Rota pai para o layout
              element={
                  isLoggedIn
                  ? <MainLayout userData={userData} handleLogout={handleLogout} /> 
                  : <Navigate replace to="/login" /> // Se não logado, vai para login
              }
          >
                {/* --- Rotas Filhas (Renderizadas DENTRO do <Outlet/> do MainLayout) --- */}

                {/* Rota índice default (ex: /) dentro do layout -> redireciona para dashboard */}
                <Route index element={<Navigate replace to="/dashboard" />} />

                {/* Rotas Comuns */}
                <Route path="dashboard" element={<DashboardPage />} />
                
                <Route path="leads" element={<LeadListPage />} />
                <Route path="leads/novo" element={<LeadFormPage />} />
                <Route path="leads/:id" element={<LeadDetailPage />} />
                <Route path="leads/:id/editar" element={<LeadFormPage />} />
                
                <Route path="/empreendimentos" element={<EmpreendimentoListPage />} />
                <Route path="/empreendimentos/novo" element={<EmpreendimentoFormPage />} />
                <Route path="/empreendimentos/:id" element={<EmpreendimentoDetailPage />} /> 
                <Route path="/empreendimentos/:id/editar" element={<EmpreendimentoFormPage />} />


                <Route path="/empreendimentos/:empreendimentoId/unidades/novo" element={<UnidadeFormPage />} />
                <Route path="/empreendimentos/:empreendimentoId/unidades/:unidadeId/editar" element={<UnidadeFormPage />} />

                <Route path="/reservas" element={<ReservaListPage />} />


                {/* Rotas Admin (Renderizadas condicionalmente DENTRO do Outlet) */}
                <Route element={<AdminGuard isAdmin={isAdmin} />}> {/* Pai que aplica a guarda */}
                                <Route path="admin/situacoes" element={<LeadStageAdminPage />} />
                                <Route path="admin/origens" element={<OrigensAdminPage />} />
                                <Route path="admin/motivosdescarte" element={<DiscardReasonAdminPage />} />
                                <Route path="admin/usuarios" element={<UsuariosAdminPage />} />
                                <Route path="admin/brokers" element={<BrokerContactsAdminPage />} />
                                <Route path="admin/modelos-contrato" element={<ModeloContratoListPage />} />
                </Route>

                <Route path="integracoes" element={<IntegrationsPage />} />

                            

                {!isAdmin && isLoggedIn && (
                    <Route path="admin/*" element={<div><h2>Acesso Negado</h2><p>Você não tem permissão.</p></div>} />
                )}

          </Route>


          {/* Rota 404 (Fora do Layout Principal) */}
          {/* Esta rota pega qualquer coisa que não deu match acima */}
          <Route path="*" element={ <div><h1>404 - Página Não Encontrada</h1><Link to="/">Voltar</Link></div> } />

        </Routes>
      {/* </div> */} {/* Fim div.App (opcional) */}
    </Router>
  );
}

export default App;