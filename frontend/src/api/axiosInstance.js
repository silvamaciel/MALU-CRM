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
// src/api/axiosInstance.js
import axios from 'axios';
import { toast } from 'react-toastify'; // Ensure toast is imported

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
      // console.log('[Axios Interceptor] Token adicionado ao header:', `Bearer ${token.substring(0, 15)}...`);
    } else {
      // console.log('[Axios Interceptor] Nenhum token encontrado no localStorage.');
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
    // console.error('[Axios Interceptor] Erro na resposta da API:', error.response || error);

    if (error.response) {
      const { status, data } = error.response;

      if (status === 401) {
        console.log('[Axios Interceptor] Recebido erro 401. Fazendo logout...');
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');

        toast.error("Sua sessão expirou ou você não está autorizado. Por favor, faça login novamente.");

        if (window.location.pathname !== '/login') {
          setTimeout(() => {
            window.location.href = '/login';
          }, 2500); // Increased delay slightly for toast visibility
        }
      } else if (status === 403) {
        toast.error(data?.error || data?.message || "Acesso negado. Você não tem permissão para realizar esta ação.");
      } else if (status >= 500) { // Server errors
        toast.error(data?.error || data?.message || "Ocorreu um erro no servidor. Tente novamente mais tarde.");
      }
      // For other errors (e.g., 400, 404), let the component calling the API handle them specifically
      // as they often require contextual error messages.
    } else if (error.request) {
      toast.error("Não foi possível conectar ao servidor. Verifique sua conexão ou tente novamente mais tarde.");
    } else {
      toast.error("Erro ao realizar a requisição: " + error.message);
    }
    return Promise.reject(error);
  }
);




export default axiosInstance;