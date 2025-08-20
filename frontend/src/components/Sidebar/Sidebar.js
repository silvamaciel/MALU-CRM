// src/components/Sidebar/Sidebar.js
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import './Sidebar.css';
import maluIcon from "../../assets/malucrmhorizontal.png";

// Ícones
import {
  FiHome,
  FiMessageSquare,
  FiUsers,
  FiCheckSquare,
  FiLayers,
  FiCalendar,
  FiSettings,
  FiTag,
  FiShare2,
  FiTrash2,
  FiUser,
  FiUserCheck,
  FiLink,
  FiFileText,
  FiDollarSign
} from 'react-icons/fi';

function Sidebar({ userData, handleLogout, closeMobileSidebar }) {
  const isAdmin = userData?.perfil === 'admin';
  const location = useLocation();

  const handleLinkClick = () => {
    if (window.innerWidth < 992) {
      closeMobileSidebar();
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <img src={maluIcon} alt="Logo" style={{ height: '98px' }} />
      </div>

      <nav className="sidebar-nav">
        <ul>
          <li>
            <NavLink to="/dashboard" onClick={handleLinkClick} className={({isActive}) => isActive ? 'active' : ''}>
              <FiHome className="icon" /><span>Dashboard</span>
            </NavLink>
          </li>

          <li>
            <NavLink to="/chat" onClick={handleLinkClick} className={({isActive}) => isActive ? 'active' : ''}>
              <FiMessageSquare className="icon" /><span>Chat</span>
            </NavLink>
          </li>

          <li>
            <NavLink to="/leads" onClick={handleLinkClick} className={({isActive}) => isActive ? 'active' : ''}>
              <FiUsers className="icon" /><span>Leads</span>
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/tasks"
              onClick={handleLinkClick}
              className={({isActive}) =>
                isActive || location.pathname.startsWith('/Tasks') ? 'active' : ''
              }
            >
              <FiCheckSquare className="icon" /><span>Tarefas</span>
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/empreendimentos"
              onClick={handleLinkClick}
              className={({isActive}) =>
                isActive || location.pathname.startsWith('/empreendimentos') ? 'active' : ''
              }
            >
              <FiLayers className="icon" /><span>Empreendimentos</span>
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/imoveis-avulsos"
              onClick={handleLinkClick}
              className={({isActive}) =>
                isActive || location.pathname.startsWith('/imoveis-avulsos') ? 'active' : ''
              }
            >
              <FiHome className="icon" /><span>Imóveis Avulsos</span>
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/reservas"
              onClick={handleLinkClick}
              className={({isActive}) =>
                isActive || location.pathname.startsWith('/reservas') ? 'active' : ''
              }
            >
              <FiCalendar className="icon" /><span>Reservas</span>
            </NavLink>
          </li>

          {/* } <li>
            <NavLink
              to="/financeiro"
              onClick={handleLinkClick}
              className={({isActive}) =>
                isActive || location.pathname.startsWith('/financeiro') ? 'active' : ''
              }
            >
              <FiDollarSign className="icon" /><span>Financeiro</span>
            </NavLink>
          </li>
          */}

          {/* Administração */}
          {isAdmin && (
            <li className="admin-section">
              <span className="admin-section-title">
                <FiSettings className="icon icon-muted" /> Administração
              </span>
              <ul>
                <li>
                  <NavLink to="/admin/situacoes" onClick={handleLinkClick} className={({isActive}) => isActive ? 'active' : ''}>
                    <FiTag className="icon" /><span>Situações</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/admin/origens" onClick={handleLinkClick} className={({isActive}) => isActive ? 'active' : ''}>
                    <FiShare2 className="icon" /><span>Origens</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/admin/motivosdescarte" onClick={handleLinkClick} className={({isActive}) => isActive ? 'active' : ''}>
                    <FiTrash2 className="icon" /><span>Motivos Descarte</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/admin/usuarios" onClick={handleLinkClick} className={({isActive}) => isActive ? 'active' : ''}>
                    <FiUser className="icon" /><span>Usuários</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/admin/brokers" className={({isActive}) => isActive ? 'active' : ''}>
                    <FiUserCheck className="icon" /><span>Corretores Parceiros</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/integracoes" onClick={handleLinkClick} className={({isActive}) => isActive ? 'active' : ''}>
                    <FiLink className="icon" /><span>Integrações</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/admin/modelos-contrato"
                    onClick={handleLinkClick}
                    className={({isActive}) =>
                      isActive || location.pathname.startsWith('/admin/modelos-contrato') ? 'active' : ''
                    }
                  >
                    <FiFileText className="icon" /><span>Modelos de Contrato</span>
                  </NavLink>
                </li>
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
