// CustomToolbar.js
export const CustomToolbar = () => (
  <div id="toolbar">
    <button className="ql-bold" />
    <button className="ql-italic" />
    <button className="ql-underline" />
    <button className="ql-list" value="ordered" />
    <button className="ql-list" value="bullet" />
    <button className="ql-indent" value="-1" />
    <button className="ql-indent" value="+1" />
    <select className="ql-align" />
    <button className="ql-blockquote" />

    <button className="ql-table" /> {/* <- TABELA */}

    <select className="ql-color" />
    <select className="ql-background" />

    <select className="ql-header" defaultValue="">
      <option value="">Formatação</option>
      <option value="1">Título 1</option>
      <option value="2">Título 2</option>
    </select>

    <select className="ql-font" />
    <select className="ql-size" />
    <button className="ql-code-block" />
  </div>
);
