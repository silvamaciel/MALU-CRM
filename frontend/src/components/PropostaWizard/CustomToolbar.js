// src/components/PropostaWizard/CustomToolbar.js
export const CustomToolbar = () => (
  <div id="toolbar">
    {/* Formatação */}
    <button className="ql-bold" />
    <button className="ql-italic" />
    <button className="ql-underline" />
    <button className="ql-strike" />
    <button className="ql-clean" />

    {/* Listas e alinhamento */}
    <button className="ql-list" value="ordered" />
    <button className="ql-list" value="bullet" />
    <button className="ql-indent" value="-1" />
    <button className="ql-indent" value="+1" />
    <select className="ql-align" />
    
    {/* Estrutura */}
    <button className="ql-blockquote" />
    <button className="ql-code-block" />
    <button className="ql-table" />

    {/* Cor e fonte */}
    <select className="ql-color" />
    <select className="ql-background" />
    <select className="ql-header">
      <option value="1" />
      <option value="2" />
      <option value="3" />
      <option value="" />
    </select>
    <select className="ql-font" />
    <select className="ql-size" />

    {/* Recursos avançados */}
    <button className="ql-link" />
    <button className="ql-video" />
    <button className="ql-placeholder">🔗Placeholder</button>
    <button className="ql-html">💻 Código-Fonte</button>

    <select class="ql-font">
      <option value="sans-serif" selected>Sans</option>
      <option value="serif">Serif</option>
      <option value="monospace">Mono</option>
      <option value="arial">Arial</option>
      <option value="times-new-roman">Times</option>
      <option value="comic-sans">Comic Sans</option>
    </select>
  </div>
  
);
