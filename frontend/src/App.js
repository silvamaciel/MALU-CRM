// src/App.jsx (ou App.js)
import React, { useState, Suspense, lazy } from "react"; // Added Suspense and lazy
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Link
} from "react-router-dom";

// Pages & Layout - Lazy load all page components
const LeadListPage = lazy(() => import("./pages/LeadList/LeadListPage"));
const LeadFormPage = lazy(() => import("./pages/LeadForm/LeadFormPage"));
const LeadDetailPage = lazy(() => import("./pages/LeadDatail/LeadDetailPage"));
const LoginPage = lazy(() => import("./pages/Login/LoginPage"));
const DashboardPage = lazy(() => import('./pages/Dashboard/DashboardPage'));
const LeadStageAdminPage = lazy(() => import('./pages/Admin/LeadStageAdminPage'));
const OrigensAdminPage = lazy(() => import('./pages/Admin/OrigensAdminPage'));
const DiscardReasonAdminPage = lazy(() => import('./pages/Admin/DiscardReasonAdminPage'));
const UsuariosAdminPage = lazy(() => import('./pages/Admin/UsuariosAdminPage'));
const MainLayout = lazy(() => import('./components/Layout/MainLayout')); // MainLayout can also be lazy loaded
const BrokerContactsAdminPage = lazy(() => import('./pages/Admin/BrokerContactsAdminPage'));
const AdminGuard = lazy(() => import('./components/Auth/AdminGuard')); // AdminGuard might not need lazy loading if small
const IntegrationsPage = lazy(() => import('./pages/Integrations/IntegrationsPage'));
const EmpreendimentoListPage = lazy(() => import('./pages/Empreendimento/EmpreendimentoListPage/EmpreendimentoListPage'));
const EmpreendimentoFormPage = lazy(() => import('./pages/Empreendimento/EmpreendimentoFormPage/EmpreendimentoFormPage'));
const EmpreendimentoDetailPage = lazy(() => import('./pages/Empreendimento/EmpreendimentoDetailPage/EmpreendimentoDetailPage'));
const UnidadeFormPage = lazy(() => import('./pages/Empreendimento/UnidadeFormPage/UnidadeFormPage'));
const ReservaListPage = lazy(() => import('./pages/Empreendimento/Reserva/ReservaListPage/ReservaListPage'));
const ModeloContratoListPage = lazy(() => import('./pages/Admin/ModeloContrato/ModeloContratoListPage/ModeloContratoListPage'));
const ModeloContratoFormPage = lazy(() => import('./pages/Admin/ModeloContrato/ModeloContratoFormPage/ModeloContratoFormPage'));
const PropostaContratoFormPage = lazy(() => import('./pages/PropostaContrato/PropostaContratoFormPage/PropostaContratoFormPage'));
const PropostaContratoDetailPage = lazy(() => import('./pages/PropostaContrato/PropostaContratoDetailPage/PropostaContratoDetailPage'));
const ImovelListPage = lazy(() => import('./pages/ImovelAvulso/ImovelListPage/ImovelListPage'));
const ImovelFormPage = lazy(() => import('./pages/ImovelAvulso/ImovelFormPage/ImovelFormPage'));


// Libs & CSS
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";

// Fallback component for Suspense
const PageLoader = () => <div className="page-loading-spinner">Carregando página...</div>;


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
                <Suspense fallback={<PageLoader />}>
                  {!isLoggedIn ? ( <LoginPage onLoginSuccess={handleLoginSuccess} /> )
                   : ( <Navigate replace to="/dashboard" /> ) // Logado? Vai pro dashboard
                  }
                </Suspense>
              }
          />

          {/* --- Rotas Protegidas QUE USAM o MainLayout --- */}
          <Route
              path="/" // Rota pai para o layout
              element={
                <Suspense fallback={<PageLoader />}>
                  {isLoggedIn
                  ? <MainLayout userData={userData} handleLogout={handleLogout} /> 
                  : <Navigate replace to="/login" /> // Se não logado, vai para login
                  }
                </Suspense>
              }
          >
                {/* --- Rotas Filhas (Renderizadas DENTRO do <Outlet/> do MainLayout) --- */}

                {/* Rota índice default (ex: /) dentro do layout -> redireciona para dashboard */}
                <Route index element={<Navigate replace to="/dashboard" />} />

                {/* Rotas Comuns */}
                <Route path="dashboard" element={<Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>} />
                
                <Route path="leads" element={<Suspense fallback={<PageLoader />}><LeadListPage /></Suspense>} />
                <Route path="leads/novo" element={<Suspense fallback={<PageLoader />}><LeadFormPage /></Suspense>} />
                <Route path="leads/:id" element={<Suspense fallback={<PageLoader />}><LeadDetailPage /></Suspense>} />
                <Route path="leads/:id/editar" element={<Suspense fallback={<PageLoader />}><LeadFormPage /></Suspense>} />
                
                <Route path="/empreendimentos" element={<Suspense fallback={<PageLoader />}><EmpreendimentoListPage /></Suspense>} />
                <Route path="/empreendimentos/novo" element={<Suspense fallback={<PageLoader />}><EmpreendimentoFormPage /></Suspense>} />
                <Route path="/empreendimentos/:id" element={<Suspense fallback={<PageLoader />}><EmpreendimentoDetailPage /></Suspense>} />
                <Route path="/empreendimentos/:id/editar" element={<Suspense fallback={<PageLoader />}><EmpreendimentoFormPage /></Suspense>} />


                <Route path="/empreendimentos/:empreendimentoId/unidades/novo" element={<Suspense fallback={<PageLoader />}><UnidadeFormPage /></Suspense>} />
                <Route path="/empreendimentos/:empreendimentoId/unidades/:unidadeId/editar" element={<Suspense fallback={<PageLoader />}><UnidadeFormPage /></Suspense>} />

                <Route path="/imoveis-avulsos" element={<Suspense fallback={<PageLoader />}><ImovelListPage /></Suspense>} />
                <Route path="/imoveis-avulsos/novo" element={<Suspense fallback={<PageLoader />}><ImovelFormPage /></Suspense>} />
                <Route path="/imoveis-avulsos/:id/editar" element={<Suspense fallback={<PageLoader />}><ImovelFormPage /></Suspense>} />

                <Route path="/reservas" element={<Suspense fallback={<PageLoader />}><ReservaListPage /></Suspense>} />

                <Route path="/reservas/:reservaId/proposta-contrato/novo" element={<Suspense fallback={<PageLoader />}><PropostaContratoFormPage /></Suspense>} />
                <Route path="/propostas-contratos/:propostaContratoId" element={<Suspense fallback={<PageLoader />}><PropostaContratoDetailPage /></Suspense>} />
                <Route path="/propostas-contratos/:propostaContratoId/editar" element={<Suspense fallback={<PageLoader />}><PropostaContratoFormPage /></Suspense>} />




                {/* Rotas Admin (Renderizadas condicionalmente DENTRO do Outlet) */}
                <Route element={<Suspense fallback={<PageLoader />}><AdminGuard isAdmin={isAdmin} /></Suspense>}> {/* Pai que aplica a guarda */}
                                <Route path="admin/situacoes" element={<Suspense fallback={<PageLoader />}><LeadStageAdminPage /></Suspense>} />
                                <Route path="admin/origens" element={<Suspense fallback={<PageLoader />}><OrigensAdminPage /></Suspense>} />
                                <Route path="admin/motivosdescarte" element={<Suspense fallback={<PageLoader />}><DiscardReasonAdminPage /></Suspense>} />
                                <Route path="admin/usuarios" element={<Suspense fallback={<PageLoader />}><UsuariosAdminPage /></Suspense>} />
                                <Route path="admin/brokers" element={<Suspense fallback={<PageLoader />}><BrokerContactsAdminPage /></Suspense>} />
                                
                                <Route path="admin/modelos-contrato" element={<Suspense fallback={<PageLoader />}><ModeloContratoListPage /></Suspense>} />
                                <Route path="admin/modelos-contrato/novo" element={<Suspense fallback={<PageLoader />}><ModeloContratoFormPage /></Suspense>} />
                                <Route path="admin/modelos-contrato/:id/editar" element={<Suspense fallback={<PageLoader />}><ModeloContratoFormPage /></Suspense>} />
                </Route>

                <Route path="integracoes" element={<Suspense fallback={<PageLoader />}><IntegrationsPage /></Suspense>} />

                            

                {!isAdmin && isLoggedIn && (
                    <Route path="admin/*" element={<div><h2>Acesso Negado</h2><p>Você não tem permissão.</p></div>} />
                )}

          </Route>


          {/* Rota 404 (Fora do Layout Principal) */}
          {/* Esta rota pega qualquer coisa que não deu match acima */}
          <Route path="*" element={ <Suspense fallback={<PageLoader />}><div><h1>404 - Página Não Encontrada</h1><Link to="/">Voltar</Link></div></Suspense> } />

        </Routes>
      {/* </div> */} {/* Fim div.App (opcional) */}
    </Router>
  );
}

export default App;