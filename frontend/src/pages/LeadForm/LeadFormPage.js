// src/pages/LeadForm/LeadFormPage.js
import React, { useState, useEffect} from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
// API Functions
import { createLead, getLeadById, updateLead } from '../../api/leads';
import { getLeadStages } from '../../api/leadStages'; // Usando getLeadStages consistentemente
import { getOrigens } from '../../api/origens';
import { getUsuarios } from '../../api/usuarios'; // Ou usuarios.js - VERIFIQUE O CAMINHO/NOME REAL
// Notifications
import { toast } from 'react-toastify';
// CSS
import './LeadFormPage.css';
// Opcional: Input Mask
// import InputMask from 'react-input-mask';

// Estado inicial (com CPF)
const initialState = {
    nome: '', contato: '', email: '', nascimento: '', endereco: '', cpf: '',
    situacao: '', origem: '', responsavel: '', comentario: ''
};

function LeadFormPage() {
  const { id } = useParams(); // Pega ID da URL
  const navigate = useNavigate();
  const isEditMode = Boolean(id); // True se ID existe

  // State principal do formulário
  const [formData, setFormData] = useState(initialState);
  // State para guardar dados originais no modo edição
  const [initialData, setInitialData] = useState(null);

  // States para opções de dropdowns
  const [situacoesList, setSituacoesList] = useState([]);
  const [origensList, setOrigensList] = useState([]);
  const [usuariosList, setUsuariosList] = useState([]);

  // States de Loading e Erro
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(isEditMode); // Só carrega dados se for edição
  const [isProcessing, setIsProcessing] = useState(false); // Para submit
  const [optionsError, setOptionsError] = useState(null); // Erro ao carregar opções

  // --- Data Fetching ---

  // Efeito para buscar opções (Situação, Origem, Usuário)
  useEffect(() => {
    console.log("Buscando opções de dropdown...");
    const fetchOptions = async () => {
      // Só mostra loading de opções se não estiver no modo de edição (que tem seu próprio loading)
      if (!isEditMode) setLoadingOptions(true);
      setOptionsError(null);
      try {
        const [situacoesData, origensData, usuariosData] = await Promise.all([
          getLeadStages(),
          getOrigens(),
          getUsuarios() // <-- Verifique se esta função/API está correta
        ]);
        setSituacoesList(Array.isArray(situacoesData) ? situacoesData : []);
        setOrigensList(Array.isArray(origensData) ? origensData : []);
        setUsuariosList(Array.isArray(usuariosData) ? usuariosData : []);
         if (!Array.isArray(situacoesData) || !Array.isArray(origensData) || !Array.isArray(usuariosData)) {
             console.warn("Uma ou mais APIs de opções não retornaram um array.");
         }
      } catch (error) {
        console.error("Erro ao buscar opções:", error);
        const errorMsg = error.message || "Falha ao carregar opções para o formulário.";
        setOptionsError(errorMsg);
        toast.error(errorMsg);
        setSituacoesList([]); setOrigensList([]); setUsuariosList([]); // Garante arrays vazios
      } finally {
        // Só para o loading de opções se não estiver carregando dados do lead no modo edição
         if (!isEditMode) setLoadingOptions(false);
      }
    };
    fetchOptions();
  }, [isEditMode]); // Roda se o modo mudar (raro, mas seguro)

  // Efeito para buscar dados do Lead no modo Edição E guarda estado inicial
  useEffect(() => {
    if (isEditMode && id) {
      console.log(`Modo Edição: Buscando lead ID ${id}`);
      setIsLoadingData(true);
      const fetchLeadData = async () => {
        try {
          const data = await getLeadById(id);
          const formattedNascimento = data.nascimento ? data.nascimento.substring(0, 10) : '';
          // Prepara os dados formatados para o formulário
          const formDataToSet = {
            nome: data.nome || '',
            contato: data.contato || '', // Recebe formatado do backend
            email: data.email || '',
            nascimento: formattedNascimento,
            endereco: data.endereco || '',
            cpf: data.cpf || '', // Recebe limpo do backend
            situacao: data.situacao?._id || '', // Pega o ID
            origem: data.origem?._id || '',     // Pega o ID
            responsavel: data.responsavel?._id || '', // Pega o ID
            comentario: data.comentario || '',
          };
          setFormData(formDataToSet);
          setInitialData(formDataToSet); // <<< GUARDA os dados iniciais para comparação
        } catch (err) {
          console.error("Erro ao buscar dados para edição:", err);
          toast.error(err.message || "Falha ao carregar dados do lead para edição.");
          // Navega de volta ou mostra erro permanente se falhar em carregar
          // navigate('/leads');
        } finally {
          setIsLoadingData(false);
          setLoadingOptions(false); // Garante que o loading geral pare
        }
      };
      fetchLeadData();
    } else {
      // Modo Criação
      setFormData(initialState); // Garante formulário limpo
      setInitialData(null); // Sem dados iniciais
      setIsLoadingData(false); // Não está carregando dados
       // Loading de opções é tratado no outro useEffect
       // setLoadingOptions(false); // Removido daqui
    }
  }, [id, isEditMode, navigate]); // Adicionado navigate às dependências

  // Handler de Mudança padrão
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({ ...prevState, [name]: value }));
  };

  // Handler de Submit com lógica condicional Create/Update e envio de alterações
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true); // Inicia processamento

    // Validação Frontend Mínima (Nome/Contato Obrigatórios + Email formato se preenchido)
    if (!formData.nome || !formData.contato) {
       toast.warn('Nome e Contato são obrigatórios.');
       setIsProcessing(false); return;
    }
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
       toast.warn('Formato de email inválido.');
       setIsProcessing(false); return;
    }

    let dataToSend = {};
    let operationPromise;
    let successMessage;
    let navigateTo;

    if (isEditMode) {
        // --- MODO EDIÇÃO: Enviar apenas campos alterados ---
        const changedData = {};
        if (!initialData) { // Segurança
             toast.error("Erro: Dados iniciais não carregados para comparação.");
             setIsProcessing(false); return;
        }

        Object.keys(formData).forEach(key => {
            const currentValue = formData[key] ?? '';
            const initialValue = initialData[key] ?? '';
            if (currentValue !== initialValue) {
                 // Envia null se o campo foi limpo, senão envia o valor atual
                 // Tratar 'nascimento' especificamente se '' deve ser null
                 if (key === 'nascimento' && currentValue === '') {
                     changedData[key] = null;
                 } else {
                      changedData[key] = currentValue === '' ? null : currentValue;
                 }
            }
        });

        if (Object.keys(changedData).length === 0) {
            toast.info("Nenhuma alteração detectada.");
            setIsProcessing(false); return;
        }

        dataToSend = changedData;
        console.log("Dados ALTERADOS enviados para updateLead:", dataToSend);
        operationPromise = updateLead(id, dataToSend);
        successMessage = 'Lead atualizado com sucesso!';
        navigateTo = `/leads/${id}`; // Volta para detalhes

    } else {
        // --- MODO CRIAÇÃO: Enviar dados relevantes ---
        dataToSend = { ...formData };
        // Remove chaves vazias/nulas OPCIONAIS antes de enviar
        Object.keys(dataToSend).forEach(key => {
             // Mantem nome e contato
             if (['nome', 'contato'].includes(key)) return;
             // Remove outros se vazios/nulos
             if (dataToSend[key] === '' || dataToSend[key] === null) {
                  delete dataToSend[key];
             }
        });
        // Limpa CPF se só tiver máscara/espaços
        if (dataToSend.cpf && dataToSend.cpf.replace(/\D/g, '') === '') {
            delete dataToSend.cpf;
        }

        console.log("Dados enviados para createLead:", dataToSend);
        operationPromise = createLead(dataToSend);
        successMessage = 'Lead cadastrado com sucesso!';
        navigateTo = '/leads'; // Volta para lista
    }

    // --- Executa a chamada API ---
    try {
        await operationPromise;
        toast.success(successMessage);
        if (!isEditMode) { setFormData(initialState); } // Limpa form só na criação
        setTimeout(() => { navigate(navigateTo); }, 1000); // Navega após delay
    } catch (err) {
        toast.error(err.message || `Falha ao ${isEditMode ? 'atualizar' : 'cadastrar'}.`);
        console.error(err);
    } finally {
        setIsProcessing(false); // Finaliza processamento
    }
  };

  // ---- Renderização ----

  // Loading geral inicial (opções ou dados no modo edição)
  if (loadingOptions || isLoadingData) {
     return <div className="lead-form-page loading"><p>Carregando...</p></div>;
  }
  // Erro crítico ao carregar opções
  if (optionsError) {
     return <div className="lead-form-page error"><p className="error-message">{optionsError}</p></div>;
  }

  return (
    <div className="lead-form-page">
      <h1>{isEditMode ? `Editar Lead: ${initialData?.nome || formData.nome}` : 'Cadastrar Novo Lead'}</h1>

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

        {/* Grupo 1: Nome*, Contato* */}
        <div className="form-group">
            <label htmlFor="nome">Nome Completo *</label>
            <input type="text" id="nome" name="nome" value={formData.nome} onChange={handleChange} required />
        </div>
        <div className="form-group">
            <label htmlFor="contato">Contato *</label>
            <input type="tel" id="contato" name="contato" value={formData.contato} onChange={handleChange} placeholder="(XX) XXXX-XXXX" required/>
        </div>

        {/* Grupo 2: Email, CPF (Opcionais) */}
        <div className="form-group">
           <label htmlFor="email">Email</label>
           <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} />
         </div>
         <div className="form-group">
           <label htmlFor="cpf">CPF</label>
           <input type="text" id="cpf" name="cpf" value={formData.cpf} onChange={handleChange} placeholder="000.000.000-00" maxLength={14} />
         </div>

        {/* Grupo 3: Nascimento, Endereço, Comentário (Opcionais) */}
        <div className="form-group">
           <label htmlFor="nascimento">Data de Nascimento</label>
           <input type="date" id="nascimento" name="nascimento" value={formData.nascimento} onChange={handleChange} />
        </div>
        <div className="form-group">
            <label htmlFor="endereco">Endereço</label>
            <input type="text" id="endereco" name="endereco" value={formData.endereco} onChange={handleChange} />
        </div>
         <div className="form-group">
          <label htmlFor="comentario">Comentário</label>
          <textarea id="comentario" name="comentario" value={formData.comentario} onChange={handleChange}></textarea>
        </div>

        {/* Grupo 4: Selects (Opcionais no preenchimento inicial, mas backend pode exigir/default) */}
        <div className="form-group">
          <label htmlFor="situacao">Situação</label> {/* Sem * */}
          <select id="situacao" name="situacao" value={formData.situacao} onChange={handleChange}>
            {situacoesList.map(s => <option key={s._id} value={s._id}>{s.nome}</option>)}
          </select>
        </div>
         <div className="form-group">
           <label htmlFor="origem">Origem</label> {/* Sem * */}
           <select id="origem" name="origem" value={formData.origem} onChange={handleChange}>
             {origensList.map(o => <option key={o._id} value={o._id}>{o.nome}</option>)}
           </select>
        </div>
         <div className="form-group">
           <label htmlFor="responsavel">Responsável</label> {/* Sem * */}
           <select id="responsavel" name="responsavel" value={formData.responsavel} onChange={handleChange}>
             {usuariosList.map(u => <option key={u._id} value={u._id}>{u.nome}</option>)}
           </select>
        </div>

        {/* Botão Submit */}
        <div className="form-actions">
             <button type="submit" disabled={isProcessing} className="submit-button">
              {isProcessing ? (isEditMode ? 'Salvando...' : 'Cadastrando...') : (isEditMode ? 'Salvar Alterações' : 'Cadastrar Lead')}
             </button>
        </div>
      </form>
    </div>
  );
}

export default LeadFormPage;