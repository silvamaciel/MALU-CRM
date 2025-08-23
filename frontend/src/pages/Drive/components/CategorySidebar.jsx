import React from 'react';

export default function CategorySidebar({ categorias, selected, onSelect }) {
  return (
    <aside className="drive-sidebar">
      <nav>
        <ul>
          {categorias.map((cat) => (
            <li key={cat}>
              <button
                onClick={() => onSelect(cat)}
                className={selected === cat ? 'active' : ''}
              >
                {cat}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
