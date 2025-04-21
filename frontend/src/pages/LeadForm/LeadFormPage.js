// src/pages/LeadForm/LeadFormPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom'; // Link pode ser usado nos botões superiores
import { createLead, getLeadById, updateLead } from '../../api/leads';
import { getSituacoes } from '../../api/situacoes';
import { getOrigens } from '../../api/origens';
// Verifique o nome/caminho real do seu arquivo API para usuários
import { getUsuarios } from '../../api/usuarios'; // Ou '../../api/usuarios'
import { toast } from 'react-toastify';
import './LeadFormPage.css';

// Estado inicial revertido (sem CPF)
const initialState = {
    nome: '', contato: '', email: '', nascimento: '', endereco: '',
    situacao: '', origem: '', responsavel: '', comentario: ''
    // SEM CPF
};

function LeadFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [formData, setFormData] = useState(initialState);
  const [situacoesList, setSituacoesList] = useState([]);
  const [origensList, setOrigensList] = useState([]);
  const [usuariosList, setUsuariosList] = useState([]);

  const [loadingOptions, setLoadingOptions] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(isEditMode);
  const [isProcessing, setIsProcessing] = useState(false);
  const [optionsError, setOptionsError] = useState(null);
  // Estados de erro/sucesso removidos, usando toast

  // Efeito para buscar opções dos dropdowns
  useEffect(() => {
    const fetchOptions = async () => {
      // Inicia loading apenas se não estiver já carregando dados no modo edição
      if (!isEditMode) setLoadingOptions(true);
      setOptionsError(null);
      try {
        const [situacoesData, origensData, usuariosData] = await Promise.all([
          getSituacoes(), getOrigens(), getUsuarios()
        ]);
        setSituacoesList(Array.isArray(situacoesData) ? situacoesData : []);
        setOrigensList(Array.isArray(origensData) ? origensData : []);
        setUsuariosList(Array.isArray(usuariosData) ? usuariosData : []);
      } catch (error) {
        console.error("Erro ao buscar opções:", error);
        setOptionsError("Falha ao carregar opções. Tente recarregar.");
        toast.error("Falha ao carregar opções para o formulário.");
      } finally {
         // Só para loading de opções se não estiver no modo de edição (que tem seu próprio loading)
         if (!isEditMode) setLoadingOptions(false);
      }
    };
    fetchOptions();
  }, [isEditMode]); // Depende de isEditMode

  // Efeito para buscar dados do Lead no modo Edição (sem CPF)
  useEffect(() => {
    if (isEditMode && id) {
      console.log(`Modo Edição: Buscando lead com ID ${id}`);
      setIsLoadingData(true);
      const fetchLeadData = async () => {
        try {
          const data = await getLeadById(id);
          const formattedNascimento = data.nascimento ? data.nascimento.substring(0, 10) : '';
          setFormData({
            nome: data.nome || '',
            contato: data.contato || '',
            email: data.email || '',
            nascimento: formattedNascimento,
            endereco: data.endereco || '',
            // SEM CPF
            situacao: data.situacao?._id || '',
            origem: data.origem?._id || '',
            responsavel: data.responsavel?._id || '',
            comentario: data.comentario || '',
          });
        } catch (err) {
          console.error("Erro ao buscar dados para edição:", err);
          toast.error(err.message || "Falha ao carregar dados para edição.");
          // Poderia navegar de volta ou mostrar mensagem de erro mais permanente
        } finally {
          setIsLoadingData(false);
          setLoadingOptions(false); // Garante que loading pare após buscar dados
        }
      };
      fetchLeadData();
    } else {
      setFormData(initialState); // Reseta para modo criação
      setIsLoadingData(false); // Garante que não está carregando
    }
  }, [id, isEditMode]); // Depende do ID e do modo

  // Handler de Mudança (sem alterações)
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({ ...prevState, [name]: value }));
  };

  // Handler de Submit (Validação e Limpeza Revertidas)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);

    // Validação Frontend (voltando a exigir os selects)
    if (!formData.nome || !formData.contato || !formData.email || !formData.situacao || !formData.origem || !formData.responsavel) {
       toast.warn('Todos os campos marcados com * são obrigatórios.');
       setIsProcessing(false);
       return;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
       toast.warn('Formato de email inválido.');
       setIsProcessing(false);
       return;
    }
    // SEM validação de CPF aqui

    // Preparar dados: Enviar o formData como está (backend valida)
    const dataToSend = { ...formData };

    // REMOVIDA lógica de limpar campos opcionais vazios (deixamos backend lidar)
    // Apenas garantimos que campos não preenchidos sejam null ou string vazia pelo estado inicial

    console.log(`Dados enviados para ${isEditMode ? 'updateLead' : 'createLead'}:`, dataToSend);

    try {
      if (isEditMode) {
        await updateLead(id, dataToSend);
        toast.success('Lead atualizado com sucesso!');
        setTimeout(() => { navigate(`/leads/${id}`); }, 1000); // Menor delay
      } else {
        await createLead(dataToSend);
        toast.success('Lead cadastrado com sucesso!');
        setFormData(initialState); // Limpa form
        setTimeout(() => { navigate('/leads'); }, 1000); // Menor delay
      }
    } catch (err) {
      console.error(`Erro ao ${isEditMode ? 'atualizar' : 'cadastrar'} lead:`, err);
      toast.error(err.message || `Falha ao ${isEditMode ? 'atualizar' : 'cadastrar'} o lead.`);
    } finally {
      setIsProcessing(false);
    }
  };

  // ---- Renderização ----

  // Loading principal (Opções ou Dados do Lead)
  if (loadingOptions || isLoadingData) {
     return <div className="lead-form-page loading"><p>Carregando...</p></div>;
  }
  // Erro crítico ao carregar opções (bloqueia renderização do form)
  if (optionsError) {
     return <div className="lead-form-page error"><p className="error-message">{optionsError}</p></div>;
  }
  // Se chegou aqui, opções carregaram e dados do lead (se edit) também (ou é modo create)

  return (
    <div className="lead-form-page">
      <h1>{isEditMode ? `Editar Lead: ${formData.nome}` : 'Cadastrar Novo Lead'}</h1>

      {/* Botões Voltar (apenas modo edição) */}
      {isEditMode && (
          <div className="form-top-actions">
              <Link to={`/leads/${id}`} className="button back-to-detail-button">
                   <i className="fas fa-arrow-left"></i> Cancelar Edição
              </Link>
              <Link to="/leads" className="button back-to-list-button">
                   <i className="fas fa-list"></i> Voltar para Lista
              </Link>
          </div>
      )}

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="lead-form">

        {/* Grupo 1: Nome*, Email*, Contato* */}
        <div className="form-group">
            <label htmlFor="nome">Nome Completo *</label>
            <input type="text" id="nome" name="nome" value={formData.nome} onChange={handleChange} required />
        </div>
        <div className="form-group">
           <label htmlFor="email">Email *</label>
           <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required />
        </div>
        <div className="form-group">
            <label htmlFor="contato">Contato *</label>
            <input type="tel" id="contato" name="contato" value={formData.contato} onChange={handleChange} placeholder="(XX) XXXX-XXXX" required/>
          </div>

        {/* Grupo 2: Nascimento, Endereço */}
        <div className="form-group">
           <label htmlFor="nascimento">Data de Nascimento</label>
           <input type="date" id="nascimento" name="nascimento" value={formData.nascimento} onChange={handleChange} />
        </div>
        <div className="form-group">
            <label htmlFor="endereco">Endereço</label>
            <input type="text" id="endereco" name="endereco" value={formData.endereco} onChange={handleChange} />
        </div>

        {/* REMOVIDO Input CPF */}

        {/* Grupo 3: Selects Obrigatórios */}
        <div className="form-group">
          <label htmlFor="situacao">Situação *</label>
          <select id="situacao" name="situacao" value={formData.situacao} onChange={handleChange} required> {/* <-- required ADICIONADO DE VOLTA */}
            <option value="" disabled>Selecione...</option>
            {situacoesList.map(s => <option key={s._id} value={s._id}>{s.nome}</option>)}
          </select>
        </div>
         <div className="form-group">
           <label htmlFor="origem">Origem *</label>
           <select id="origem" name="origem" value={formData.origem} onChange={handleChange} required> {/* <-- required ADICIONADO DE VOLTA */}
             <option value="" disabled>Selecione...</option>
             {origensList.map(o => <option key={o._id} value={o._id}>{o.nome}</option>)}
           </select>
        </div>
         <div className="form-group">
           <label htmlFor="responsavel">Responsável *</label>
           <select id="responsavel" name="responsavel" value={formData.responsavel} onChange={handleChange} required> {/* <-- required ADICIONADO DE VOLTA */}
             <option value="" disabled>Selecione...</option>
             {usuariosList.map(u => <option key={u._id} value={u._id}>{u.nome}</option>)}
           </select>
        </div>

        {/* Comentário */}
        <div className="form-group">
          <label htmlFor="comentario">Comentário</label>
          <textarea id="comentario" name="comentario" value={formData.comentario} onChange={handleChange}></textarea>
        </div>

        {/* Botão Submit */}
        <div className="form-actions">
             <button type="submit" disabled={isProcessing} className="submit-button">
              {isProcessing ? (isEditMode ? 'Salvando...' : 'Cadastrando...') : (isEditMode ? 'Salvar Alterações' : 'Cadastrar Lead')}
             </button>
             {/* Botão Cancelar removido daqui (agora está no topo) */}
        </div>
      </form>
    </div>
  );
}

export default LeadFormPage;