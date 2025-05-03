// src/components/Header/Header.js
import React from 'react';
import './Header.css';

// Recebe a função para alternar a sidebar vinda do MainLayout
function Header({ onToggleSidebar }) {
  return (
    <header className="main-header">
      {/* Botão Hambúrguer - Visível apenas em telas menores via CSS */}
      <button className="sidebar-toggle-button" onClick={onToggleSidebar} aria-label="Abrir menu">
        <span className="hamburger-icon-line"></span>
        <span className="hamburger-icon-line"></span>
        <span className="hamburger-icon-line"></span>
      </button>
      <div className="header-title">Meu CRM</div>
    </header>
  );
}

export default Header;