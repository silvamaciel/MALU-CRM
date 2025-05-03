// src/components/Layout/MainLayout.js
import React, { useState } from 'react';
import { Outlet } from "react-router-dom"; // Importa Outlet para renderizar rotas filhas
import Sidebar from "../Sidebar/Sidebar"; // Importa o componente da Sidebar (a criar)
import Header from '../Header/Header';
import "./MainLayout.css"; // CSS para o layout

// Recebe dados do usuário e função de logout do App.js
function MainLayout({ userData, handleLogout }) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen((prevState) => !prevState);
  };

  return (
    <div className={`main-layout ${isMobileSidebarOpen ? 'mobile-sidebar-open' : ''}`}>
            {/* Sidebar agora sempre renderizada (CSS controla visibilidade) */}
            <Sidebar userData={userData} handleLogout={handleLogout} />

            {/* Container para Header + Conteúdo */}
            <div className="content-wrapper">
                 {/* Renderiza o Header passando a função toggle */}
                 <Header onToggleSidebar={toggleMobileSidebar} />

                 {/* Área principal onde o conteúdo da página atual será renderizado */}
                <div className="main-content">
                    <Outlet />
                </div>
            </div>
        </div>
  );
}

export default MainLayout;
