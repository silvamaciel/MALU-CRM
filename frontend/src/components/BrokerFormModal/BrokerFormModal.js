// src/components/BrokerFormModal/BrokerFormModal.jsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import './BrokerFormModal.css';

const EMPTY = {
  nome: '', contato: '', email: '', creci: '', nomeImobiliaria: '', cpfCnpj: '', ativo: true,
};

export default function BrokerFormModal({
  isOpen,
  onClose,
  initialData = null,   // objeto do corretor (para editar) ou null (para criar)
  onSubmit,             // (payload, { mode, id, changed }) => Promise | void
  title,                // opcional, sobrescreve o título padrão
  isProcessing = false, // loading controlado pelo parent (opcional)
}) {
  const mode = initialData?._id ? 'edit' : 'create';
  const [form, setForm] = useState(EMPTY);
  const [base, setBase] = useState(null); // snapshot pra comparação
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    if (mode === 'edit') {
      const filled = {
        nome: initialData?.nome || '',
        contato: initialData?.contato || '',
        email: initialData?.email || '',
        creci: initialData?.creci || '',
        nomeImobiliaria: initialData?.nomeImobiliaria || '',
        cpfCnpj: initialData?.cpfCnpj || '',
        ativo: initialData?.ativo === undefined ? true : !!initialData?.ativo,
      };
      setForm(filled);
      setBase(filled);
    } else {
      setForm(EMPTY);
      setBase(null);
    }
    setError(null);
  }, [isOpen, mode, initialData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };
  const handlePhone = useCallback((val) => {
    setForm((p) => ({ ...p, contato: val || '' }));
  }, []);

  const changed = useMemo(() => {
    if (mode === 'create') return Object.keys(form).filter(k => form[k] !== EMPTY[k]);
    if (!base) return [];
    return Object.keys(form).filter(k => (form[k] ?? '') !== (base[k] ?? ''));
  }, [form, base, mode]);

  const buildPayload = () => {
    if (mode === 'edit') {
      const diff = {};
      changed.forEach((k) => {
        const v = form[k];
        diff[k] = v === '' ? null : v;
      });
      return diff;
    }
    // create: limpa opcionais vazios
    const data = { ...form };
    Object.keys(data).forEach((k) => {
      if (k !== 'nome' && (data[k] === '' || data[k] === null)) delete data[k];
    });
    return data;
  };

  const validate = () => {
    if (!form.nome) return 'O nome é obrigatório.';
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) return 'Formato de email inválido.';
    if (form.contato && !isValidPhoneNumber(form.contato)) return 'Formato de telefone inválido.';
    return null;
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    const v = validate();
    if (v) { setError(v); return; }
    if (mode === 'edit' && changed.length === 0) {
      setError('Nenhuma alteração detectada.'); return;
    }
    const payload = buildPayload();
    await Promise.resolve(
      onSubmit?.(payload, { mode, id: initialData?._id, changed })
    );
  };

  if (!isOpen) return null;

  return (
    <div className="form-modal-overlay" onClick={isProcessing ? undefined : onClose}>
      <div className="form-modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{title ?? (mode === 'edit' ? 'Editar Corretor' : 'Adicionar Novo Corretor')}</h2>
        <form onSubmit={submit}>
          {/* Nome */}
          <div className="form-group">
            <label htmlFor="f_nome">Nome *</label>
            <input id="f_nome" name="nome" value={form.nome} onChange={handleChange} required disabled={isProcessing} />
          </div>

          {/* Contato */}
          <div className="form-group">
            <label htmlFor="f_contato">Contato</label>
            <PhoneInput
              id="f_contato"
              name="contato"
              placeholder="Digite o telefone"
              value={form.contato}
              onChange={handlePhone}
              defaultCountry="BR"
              international
              limitMaxLength
              className="form-control phone-input-control"
              disabled={isProcessing}
            />
            {form.contato && !isValidPhoneNumber(form.contato) && (
              <small className="input-error-message">Formato inválido</small>
            )}
          </div>

          {/* Email */}
          <div className="form-group">
            <label htmlFor="f_email">Email</label>
            <input id="f_email" type="email" name="email" value={form.email} onChange={handleChange} disabled={isProcessing} />
          </div>

          {/* CRECI */}
          <div className="form-group">
            <label htmlFor="f_creci">CRECI</label>
            <input id="f_creci" name="creci" value={form.creci} onChange={handleChange} disabled={isProcessing} />
          </div>

          {/* Imobiliária */}
          <div className="form-group">
            <label htmlFor="f_nomeImobiliaria">Nome Imobiliária (ou deixe em branco se Autônomo)</label>
            <input id="f_nomeImobiliaria" name="nomeImobiliaria" value={form.nomeImobiliaria} onChange={handleChange} disabled={isProcessing} />
          </div>

          {/* CPF/CNPJ */}
          <div className="form-group">
            <label htmlFor="f_cpfcnpj">CPF/CNPJ</label>
            <input id="f_cpfcnpj" name="cpfCnpj" value={form.cpfCnpj} onChange={handleChange} placeholder="Apenas números" disabled={isProcessing} />
          </div>

          {/* Ativo */}
          <div className="form-group form-group-checkbox">
            <input id="f_ativo" type="checkbox" name="ativo" checked={form.ativo} onChange={handleChange} disabled={isProcessing} />
            <label htmlFor="f_ativo">Contato Ativo</label>
          </div>

          {error && <p className="error-message modal-error">{error}</p>}

          <div className="form-actions">
            <button type="submit" className="button submit-button" disabled={isProcessing}>
              {isProcessing ? 'Salvando...' : (mode === 'edit' ? 'Salvar Alterações' : 'Adicionar Corretor')}
            </button>
            <button type="button" className="button cancel-button" onClick={onClose} disabled={isProcessing}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
