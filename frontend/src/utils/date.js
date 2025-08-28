export function dateToInput(v) {
  if (!v) return '';
  // Se já vier "YYYY-MM-DD" ou "YYYY-MM-DDTHH:MM:SSZ", só fatiar
  if (typeof v === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
    // Converte "DD/MM/YYYY" -> "YYYY-MM-DD"
    const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  }
  // Se vier Date, formata sem fuso
  if (v instanceof Date && !isNaN(v)) {
    const yyyy = v.getFullYear();
    const mm = String(v.getMonth() + 1).padStart(2, '0');
    const dd = String(v.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  // Último recurso: tentar parsear e formatar
  const d = new Date(v);
  if (!isNaN(d)) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  return '';
}
