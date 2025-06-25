// src/components/Sidebar/Sidebar.js
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom'; // Só precisa de NavLink
import './Sidebar.css';

import maluIcon from "../../assets/malucrmhorizontal.png";


// <<< Recebe closeMobileSidebar como prop >>>
function Sidebar({ userData, handleLogout, closeMobileSidebar }) {
    const isAdmin = userData?.perfil === 'admin';
    const location = useLocation();

    // <<< Função para lidar com clique no link >>>
    const handleLinkClick = () => {
        // Fecha a sidebar mobile APENAS se ela estiver aberta (telas pequenas)
        if (window.innerWidth < 992) { // Usa o mesmo breakpoint do CSS/MainLayout
            closeMobileSidebar();
        }
        // Navegação é feita pelo NavLink automaticamente
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <img src={maluIcon} alt="Logo" style={{ height: "98px" }} />
            </div>
            <nav className="sidebar-nav">
                <ul>
                    {/* <<< Adicionado onClick={handleLinkClick} >>> */}
                    <li><NavLink to="/dashboard" onClick={handleLinkClick} className={({isActive}) => isActive ? 'active' : ''}>Dashboard</NavLink></li>
                    <li><NavLink to="/leads" onClick={handleLinkClick} className={({isActive}) => isActive ? 'active' : ''}>Leads</NavLink></li>
                    <li><NavLink to="/empreendimentos" onClick={handleLinkClick} className={({isActive}) => isActive || location.pathname.startsWith('/empreendimentos') ? 'active' : ''}>Empreendimentos</NavLink></li>
                     <li><NavLink to="/imoveis-avulsos" onClick={handleLinkClick} className={({isActive}) => isActive || location.pathname.startsWith('/imoveis-avulsos') ? 'active' : ''}>Imóveis Avulsos</NavLink></li>
                    <li><NavLink to="/reservas" onClick={handleLinkClick} className={({isActive}) => isActive || location.pathname.startsWith('/reservas') ? 'active' : ''}>Reservas</NavLink></li>
                    <li><NavLink to="/agenda" onClick={handleLinkClick} className={({isActive}) => isActive || location.pathname.startsWith('/agenda') ? 'active' : ''}>Agenda</NavLink></li>


                    {/* Links de Administração */}
                    {isAdmin && (
                        <li className="admin-section">
                            <span className="admin-section-title">Administração</span>
                            <ul>
                                {/* <<< Adicionado onClick={handleLinkClick} >>> */}
                                <li><NavLink to="/admin/situacoes" onClick={handleLinkClick} className={({isActive}) => isActive ? 'active' : ''}>Situações</NavLink></li>
                                <li><NavLink to="/admin/origens" onClick={handleLinkClick} className={({isActive}) => isActive ? 'active' : ''}>Origens</NavLink></li>
                                <li><NavLink to="/admin/motivosdescarte" onClick={handleLinkClick} className={({isActive}) => isActive ? 'active' : ''}>Motivos Descarte</NavLink></li>
                                <li><NavLink to="/admin/usuarios" onClick={handleLinkClick} className={({isActive}) => isActive ? 'active' : ''}>Usuários</NavLink></li>
                                <li><NavLink to="/admin/brokers" className={({isActive}) => isActive ? 'active' : ''}>Agenda Corretores</NavLink></li>
                                <li><NavLink to="/integracoes" onClick={handleLinkClick} className={({isActive}) => isActive ? 'active' : ''}>Integrações</NavLink></li>
                                <li><NavLink to="/admin/modelos-contrato" onClick={handleLinkClick} className={({isActive}) => isActive || location.pathname.startsWith('/admin/modelos-contrato') ? 'active' : ''}>Modelos de Contrato</NavLink></li>
                            </ul>
                        </li>
                    )}
                </ul>
            </nav>
            <div className="sidebar-footer">
                <div className="user-info">
                    <span>Olá, {userData?.nome || 'Usuário'}!</span>
                </div>
                <button onClick={handleLogout} className="logout-button">
                    Sair
                </button>
            </div>
        </aside>
    );
}

export default Sidebar;