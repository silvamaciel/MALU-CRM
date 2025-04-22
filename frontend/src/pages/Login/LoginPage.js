// src/pages/Login/LoginPage.js
import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google'; // <<< Importar o botão/componente de login
import { jwtDecode } from "jwt-decode"; // Para decodificar o token e ver o que veio (opcional) npm install jwt-decode
import { loginWithGoogle } from '../../api/auth'; // Função da nossa API service
import './LoginPage.css'; // Opcional
// Importante: Adicionar lógica para lidar com o token recebido do backend (salvar, redirecionar)

function LoginPage({ onLoginSuccess }) { // Recebe uma função para chamar após login bem-sucedido
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Chamado quando o login com Google é BEM SUCEDIDO no lado do Google
  const handleLoginSuccess = async (credentialResponse) => {
    setError(null);
    setIsLoading(true);
    console.log("Google Login Success! CredentialResponse:", credentialResponse);

    // O credentialResponse.credential é o ID Token JWT que o Google fornece
    const idToken = credentialResponse.credential;

    if (idToken) {
      try {
        // Opcional: Decodificar para ver as infos (nome, email, etc.)
        const decodedToken = jwtDecode(idToken);
        console.log("Decoded ID Token:", decodedToken);

        // <<< Envia o ID Token para o seu backend >>>
        const backendResponse = await loginWithGoogle(idToken);

        // <<< AQUI: Lógica após receber a resposta do SEU backend >>>
        // Exemplo: Salvar o token JWT da SUA aplicação no localStorage e chamar onLoginSuccess
        if (backendResponse && backendResponse.token) {
          console.log("Login no backend bem-sucedido, recebido token:", backendResponse.token);
          localStorage.setItem('userToken', backendResponse.token); // Salva o token localmente
          localStorage.setItem('userData', JSON.stringify(backendResponse.user || {})); // Salva dados do usuário
          if (typeof onLoginSuccess === 'function') {
            onLoginSuccess(); // Notifica o App.js que o login foi feito
          }
        } else {
           throw new Error("Resposta inválida do servidor após login.");
        }

      } catch (err) {
        console.error("Erro no processo de login:", err);
        setError(err.message || "Falha no login. Tente novamente.");
        // Limpa token se deu erro
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
      } finally {
        setIsLoading(false);
      }
    } else {
      setError("Não foi possível obter as credenciais do Google.");
      setIsLoading(false);
    }
  };

  // Chamado quando há erro NO PROCESSO de login do Google
  const handleLoginError = () => {
    console.error("Google Login Failed");
    setError("Falha ao tentar fazer login com o Google. Verifique pop-ups bloqueados ou tente novamente.");
    setIsLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <h1>Login - CRM Imobiliário</h1>
        <p>Entre com sua conta Google para continuar.</p>

        {isLoading && <p>Processando login...</p>}
        {error && <p className="error-message">{error}</p>}

        <div className="google-login-button-container">
          {!isLoading && (
            <GoogleLogin
              onSuccess={handleLoginSuccess}
              onError={handleLoginError}
              useOneTap // Opcional: tenta login automático se já logado no Google
              // theme="filled_blue" // Outras opções de tema/aparência
              // size="large"
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default LoginPage;