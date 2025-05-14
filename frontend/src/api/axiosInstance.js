// src/api/axiosInstance.js
import axios from 'axios';

// Define a URL base da sua API (leia do .env se preferir)
const API_BASE_URL = process.env.REACT_APP_API_URL || process.env.VITE_API_URL || 'https://malu-crm.onrender.com/api';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  // Pode definir outros padrões aqui, como timeout
  // timeout: 10000,
});

// --- Interceptor de Requisição ---
// Esta função será executada ANTES de CADA requisição ser enviada pela instância axiosInstance
axiosInstance.interceptors.request.use(
  (config) => {
    // 1. Pega o token do localStorage
    const token = localStorage.getItem('userToken');

    // 2. Se o token existir, adiciona ao cabeçalho Authorization
    if (token) {
      // Adiciona o cabeçalho no formato "Bearer SEU_TOKEN_AQUI"
      config.headers.Authorization = `Bearer ${token}`;
      console.log('[Axios Interceptor] Token adicionado ao header:', `Bearer ${token.substring(0, 15)}...`); // Log para depuração (não logue o token inteiro em produção!)
    } else {
      console.log('[Axios Interceptor] Nenhum token encontrado no localStorage.');
    }

    // 3. Retorna a configuração modificada (ou original) para a requisição prosseguir
    return config;
  },
  (error) => {
    // Faz algo se houver um erro AO MONTAR a requisição (raro)
    console.error('[Axios Interceptor] Erro ao configurar requisição:', error);
    return Promise.reject(error);
  }
);

// --- Interceptor de Resposta (Opcional, mas útil para tratar erros 401 globalmente) ---
axiosInstance.interceptors.response.use(
  (response) => {
    // Se a resposta for bem-sucedida (status 2xx), apenas a retorna
    return response;
  },
  (error) => {
    // Se a resposta for um erro
    console.error('[Axios Interceptor] Erro na resposta da API:', error.response || error);

    // Exemplo: Se for erro 401 (Não Autorizado - token inválido/expirado),
    // podemos limpar o localStorage e redirecionar para o login automaticamente.
    if (error.response && error.response.status === 401) {
      console.log('[Axios Interceptor] Recebido erro 401. Fazendo logout...');
      localStorage.removeItem('userToken');
      localStorage.removeItem('userData');
      // Redireciona para a página de login
      // Usar window.location aqui é mais simples do que importar useNavigate
      // Cuidado: isso causa um refresh completo da página.
      if (window.location.pathname !== '/login') { // Evita loop se já estiver no login
           window.location.href = '/login';
           // Poderia também usar toast.error('Sua sessão expirou. Faça login novamente.');
           alert('Sua sessão expirou ou é inválida. Faça login novamente.'); // Alert simples como fallback
      }
    }

    // Rejeita a promessa para que o erro possa ser tratado no local da chamada (ex: toast.error)
    return Promise.reject(error);
  }
);

/**
 * Busca a lista de formulários de Lead Ad de uma Página do Facebook específica.
 * @param {string} pageId - O ID da Página do Facebook.
 * @returns {Promise<Array>} Um array de objetos de formulário (ex: {id, name, status}).
 */
export const listFacebookPageFormsApi = async (pageId) => {
  if (!pageId) {
      throw new Error("ID da Página é necessário para listar formulários.");
  }
  try {
      const response = await axiosInstance.get(`${API_URL_BASE}/facebook/pages/${pageId}/forms`);
      return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
      console.error(`Erro ao listar formulários para Page ID ${pageId}:`, error.response?.data || error.message);
      throw error.response?.data || new Error('Falha ao buscar formulários da página.');
  }
};


export default axiosInstance;