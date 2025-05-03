// src/components/Sidebar/Sidebar.js
import React from 'react';
import { NavLink } from 'react-router-dom'; // NavLink adiciona classe 'active' ao link atual
import './Sidebar.css'; // CSS para a Sidebar

// Recebe userData e handleLogout do MainLayout
function Sidebar({ userData, handleLogout }) {
    const isAdmin = userData?.perfil === 'admin';

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                {/* Pode colocar um logo ou nome aqui */}
                <h3>CRM Nobrega</h3>
            </div>
            <nav className="sidebar-nav">
                <ul>
                    {/* Link Ativo: Usa NavLink para estilização da rota ativa */}
                    <li><NavLink to="/dashboard" className={({isActive}) => isActive ? 'active' : ''}>Dashboard</NavLink></li>
                    <li><NavLink to="/leads" className={({isActive}) => isActive ? 'active' : ''}>Leads</NavLink></li>

                    {/* Links de Administração (Condicionais) */}
                    {isAdmin && ( // Só renderiza o bloco se for admin
                        <li className="admin-section">
                            <span className="admin-section-title">Administração</span>
                            <ul>
                                <li><NavLink to="/admin/situacoes" className={({isActive}) => isActive ? 'active' : ''}>Situações</NavLink></li>
                                <li><NavLink to="/admin/origens" className={({isActive}) => isActive ? 'active' : ''}>Origens</NavLink></li>
                                <li><NavLink to="/admin/motivosdescarte" className={({isActive}) => isActive ? 'active' : ''}>Motivos Descarte</NavLink></li>
                                <li><NavLink to="/admin/usuarios" className={({isActive}) => isActive ? 'active' : ''}>Usuários</NavLink></li>
                                <li><NavLink to="/admin/brokers" className={({isActive}) => isActive ? 'active' : ''}>Agenda Corretores</NavLink></li>
                                {/* Adicione links para outras páginas admin aqui */}
                            </ul>
                        </li>
                    )}
                </ul>
            </nav>
            <div className="sidebar-footer">
                <div className="user-info">
                    <span>Olá, {userData?.nome || 'Usuário'}!</span>
                     {/* <small>{userData?.email}</small> */}
                </div>
                 {/* Botão Logout movido para cá */}
                <button onClick={handleLogout} className="logout-button">
                    Sair
                </button>
            </div>
        </aside>
    );
}

export default Sidebar;