// src/components/Layout/MainLayout.js
import React from 'react';
import { Outlet } from 'react-router-dom'; // Importa Outlet para renderizar rotas filhas
import Sidebar from '../Sidebar/Sidebar'; // Importa o componente da Sidebar (a criar)
import './MainLayout.css'; // CSS para o layout

// Recebe dados do usuário e função de logout do App.js
function MainLayout({ userData, handleLogout }) {

    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    const toggleMobileSidebar = () => {
        setIsMobileSidebarOpen(prevState => !prevState);
    };

    
    return (
        <div className="main-layout">
            {/* Renderiza a Sidebar, passando props necessárias */}
            <Sidebar userData={userData} handleLogout={handleLogout} />

            {/* Área principal onde o conteúdo da página atual será renderizado */}
            <div className="main-content">
                <Outlet /> {/* Componente do React Router que renderiza a rota filha correspondente */}
            </div>
        </div>
    );
}

export default MainLayout;