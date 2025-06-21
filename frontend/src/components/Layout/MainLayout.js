// src/components/Layout/MainLayout.js
import React, { useState, useEffect, useCallback } from 'react'; // <<< Adicionado useEffect, useCallback
import { Outlet } from 'react-router-dom';
import Sidebar from '../Sidebar/Sidebar';
import Header from '../Header/Header';
import './MainLayout.css';

const MOBILE_BREAKPOINT = 992; 

function MainLayout({ userData, handleLogout }) {
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    const closeMobileSidebar = useCallback(() => {
        setIsMobileSidebarOpen(false);
    }, []); 

    const toggleMobileSidebar = useCallback(() => {
        setIsMobileSidebarOpen(prevState => !prevState);
    }, []);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= MOBILE_BREAKPOINT) {
                closeMobileSidebar();
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, [closeMobileSidebar]); // Depende de closeMobileSidebar

    return (
        // Adiciona classe condicional para CSS
        <div className={`main-layout ${isMobileSidebarOpen ? 'mobile-sidebar-open' : ''}`}>

            {/* <<< NOVO: Overlay para fechar ao clicar fora >>> */}
            {isMobileSidebarOpen && (
                <div
                    className="mobile-sidebar-overlay"
                    onClick={closeMobileSidebar} // <<< Fecha ao clicar no overlay
                    aria-hidden="true" // Para acessibilidade
                ></div>
            )}

            {/* Passa a função de FECHAR para a Sidebar */}
            <Sidebar
                userData={userData}
                handleLogout={handleLogout}
                closeMobileSidebar={closeMobileSidebar} // <<< Nova prop
            />

            <div className="content-wrapper">
                 {/* Passa a função de TOGGLE para o Header */}
                 <Header onToggleSidebar={toggleMobileSidebar} userData={userData} />
                 <div className="main-content">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}

export default MainLayout;