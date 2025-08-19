import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
  FiLink,        // <- usamos este para "Integrações"
  FiFileText
} from 'react-icons/fi';
import './Sidebar.css';
import maluIcon from '../../assets/malucrmhorizontal.png';

function Sidebar({ userData, handleLogout, closeMobileSidebar }) {
  const isAdmin = userData?.perfil === 'admin';
  const location = useLocation();

  const handleLinkClick = () => {
    if (window.innerWidth < 992 && typeof closeMobileSidebar === 'function') {
      closeMobileSidebar();
    }
  };

  const mainItems = [
    { to: '/dashboard', label: 'Dashboard', icon: <FiHome /> },
    { to: '/chat', label: 'Chat', icon: <FiMessageSquare /> },
    { to: '/leads', label: 'Leads', icon: <FiUsers /> },
    {
      to: '/tasks',
      label: 'Tarefas',
      icon: <FiCheckSquare />,
      isActive: (p) => p.isActive || location.pathname.startsWith('/Tasks'),
    },
    {
      to: '/empreendimentos',
      label: 'Empreendimentos',
      icon: <FiLayers />,
      isActive: (p) => p.isActive || location.pathname.startsWith('/empreendimentos'),
    },
    {
      to: '/imoveis-avulsos',
      label: 'Imóveis Avulsos',
      icon: <FiHome />,
      isActive: (p) => p.isActive || location.pathname.startsWith('/imoveis-avulsos'),
    },
    {
      to: '/reservas',
      label: 'Reservas',
      icon: <FiCalendar />,
      isActive: (p) => p.isActive || location.pathname.startsWith('/reservas'),
    },
  ];

  const adminItems = [
    { to: '/admin/situacoes', label: 'Situações', icon: <FiTag /> },
    { to: '/admin/origens', label: 'Origens', icon: <FiShare2 /> },
    { to: '/admin/motivosdescarte', label: 'Motivos Descarte', icon: <FiTrash2 /> },
    { to: '/admin/usuarios', label: 'Usuários', icon: <FiUser /> },
    { to: '/admin/brokers', label: 'Corretores Parceiros', icon: <FiUserCheck /> },
    { to: '/integracoes', label: 'Integrações', icon: <FiLink /> },
    {
      to: '/admin/modelos-contrato',
      label: 'Modelos de Contrato',
      icon: <FiFileText />,
      isActive: (p) => p.isActive || location.pathname.startsWith('/admin/modelos-contrato'),
    },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <img src={maluIcon} alt="Logo MALU CRM" className="sidebar-logo" />
      </div>

      <nav className="sidebar-nav">
        <ul className="nav-section">
          {mainItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  'nav-link ' + ((item.isActive ? item.isActive({ isActive }) : isActive) ? 'active' : '')
                }
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>

        {isAdmin && (
          <>
            <div className="nav-divider" />
            <div className="admin-title">
              <FiSettings className="admin-icon" />
              <span>Administração</span>
            </div>
            <ul className="nav-section">
              {adminItems.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={handleLinkClick}
                    className={({ isActive }) =>
                      'nav-link ' + ((item.isActive ? item.isActive({ isActive }) : isActive) ? 'active' : '')
                    }
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <span className="user-greet">Olá,</span>
          <span className="user-name">{userData?.nome || 'Usuário'}</span>
        </div>
        <button onClick={handleLogout} className="logout-button">Sair</button>
      </div>
    </aside>
  );
}

export default Sidebar;
