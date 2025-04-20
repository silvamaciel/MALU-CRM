// src/App.jsx (ou App.js)
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LeadListPage from './pages/LeadList/LeadListPage'; 
import LeadFormPage from './pages/LeadForm/LeadFormPage';
import LeadDetailPage from './pages/LeadDatail/LeadDetailPage';

// Importar outras páginas aqui quando criadas
// import LeadFormPage from './pages/LeadForm/LeadFormPage';

import './App.css'; // Seus estilos globais

function App() {
  return (
    <Router>
      {/* Pode adicionar um Layout global aqui (Navbar, Sidebar) se desejar */}
      <div className="App">
        <main> {/* Use <main> para o conteúdo principal */}
          <Routes>
            {/* Rota raiz redireciona para /leads */}
            <Route path="/" element={<Navigate replace to="/leads" />} />

            {/* Rota para listar leads */}
            <Route path="/leads" element={<LeadListPage />} />

            <Route path="/leads/novo" element={<LeadFormPage />} /> 

            <Route path="/leads/:id" element={<LeadDetailPage />} /> 

            <Route path="/leads/:id/editar" element={<LeadFormPage />} />


            {/* Rota para página não encontrada (404) */}
            <Route path="*" element={<div><h1>404 - Página Não Encontrada</h1></div>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;