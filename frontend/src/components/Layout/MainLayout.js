import React, { useState, useEffect, useCallback } from 'react';
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
    }, [closeMobileSidebar]);

    // --- Fix: vh dinâmico para mobile ---
    useEffect(() => {
        const setVh = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--app-vh', `${vh}px`);
        };
        setVh();
        window.addEventListener('resize', setVh);
        window.addEventListener('orientationchange', setVh);
        return () => {
            window.removeEventListener('resize', setVh);
            window.removeEventListener('orientationchange', setVh);
        };
    }, []);

    return (
        <div className={`main-layout ${isMobileSidebarOpen ? 'mobile-sidebar-open' : ''}`}>
            {isMobileSidebarOpen && (
                <div
                    className="mobile-sidebar-overlay"
                    onClick={closeMobileSidebar}
                    aria-hidden="true"
                ></div>
            )}

            <Sidebar
                userData={userData}
                handleLogout={handleLogout}
                closeMobileSidebar={closeMobileSidebar}
            />

            <div className="content-wrapper">
                <Header onToggleSidebar={toggleMobileSidebar} userData={userData} />
                <div className="main-content">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}

export default MainLayout;
