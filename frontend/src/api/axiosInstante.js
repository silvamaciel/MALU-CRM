// src/api/axiosInstance.js
import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:5000/api', // Sua Base URL da API
  timeout: 10000, // Opcional: tempo máximo para uma requisição (10s)
  headers: {
    'Content-Type': 'application/json',
    // Poderíamos adicionar headers de autorização aqui no futuro
  },
});

export default axiosInstance;