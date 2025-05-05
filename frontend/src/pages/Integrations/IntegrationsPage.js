// src/pages/Integrations/IntegrationsPage.js
import React, { useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { sendGoogleAuthCode } from "../../api/auth";
import { toast } from "react-toastify";
import "./IntegrationsPage.css";

function IntegrationsPage() {
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [googleError, setGoogleError] = useState(null);

  const connectGoogle = useGoogleLogin({
    flow: "auth-code", // Essencial para obter refresh token no backend
    scope: `openid email profile https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/contacts https://www.googleapis.com/auth/drive.file`, // Todos os escopos
    onSuccess: async (codeResponse) => {
      setGoogleError(null);
      setIsConnectingGoogle(true);
      console.log("Google Auth Code Response (Integrations):", codeResponse);
      try {
        // Envia o código para o mesmo endpoint de callback do backend
        // O backend deve verificar, trocar por tokens, e SALVAR O REFRESH TOKEN no usuário logado
        await sendGoogleAuthCode(codeResponse.code);
        toast.success(
          "Conta Google conectada/permissões atualizadas com sucesso!"
        );
        // Poderia adicionar um state para mostrar "Conectado" na UI
      } catch (err) {
        const errorMsg =
          err.message || "Falha ao conectar com Google. Tente novamente.";
        setGoogleError(errorMsg);
        toast.error(errorMsg);
        console.error("Erro ao processar código Google na integração:", err);
      } finally {
        setIsConnectingGoogle(false);
      }
    },
    onError: (errorResponse) => {
      console.error("Google Login Flow Error (Integrations):", errorResponse);
      setGoogleError("Falha ao iniciar conexão com Google.");
      toast.error("Falha ao iniciar conexão com Google.");
      setIsConnectingGoogle(false);
    },
  });

  return (
    <div className="integrations-page admin-page">
      {" "}
      {/* Reusa estilos admin? */}
      <h1>Integrações</h1>
      <p>Conecte suas contas de serviços externos para automatizar tarefas.</p>
      <div className="integrations-container">
        <div className="integration-card">
          <h2>Google Workspace</h2>
          <p>Conecte sua conta Google para:</p>
          <ul>
            <li>Agendar reuniões (Google Meet) na sua Agenda Google.</li>
            <li>Enviar e-mails através do seu Gmail.</li>
            <li>Salvar contatos de leads no Google Contacts.</li>
            <li>Anexar arquivos do Google Drive (futuro).</li>
          </ul>
          {/* TODO: Adicionar indicador se já está conectado */}
          <button
            onClick={() => connectGoogle()}
            className="button google-connect-button"
            disabled={isConnectingGoogle}
          >
            {isConnectingGoogle
              ? "Conectando..."
              : "Conectar / Atualizar Permissões Google"}
          </button>
          {googleError && <p className="error-message">{googleError}</p>}
        </div>

        <div className="integration-card">
          <h2>Meta (Facebook/Instagram) Lead Ads</h2>
          <p>
            Receba automaticamente leads gerados por seus anúncios no Facebook e
            Instagram.
          </p>
          {/* TODO: Adicionar indicador se já está conectado */}
          <button className="button facebook-connect-button" disabled>
            Configurar Webhook (Em breve)
          </button>
        </div>

        {/* Outras Integrações (WhatsApp, Twilio, etc) */}
        <div className="integration-card placeholder">
          <h2>WhatsApp Business API</h2>
          <p>
            <i>(Futuro)</i>
          </p>
        </div>
        <div className="integration-card placeholder">
          <h2>Twilio (SMS/Voz)</h2>
          <p>
            <i>(Futuro)</i>
          </p>
        </div>
      </div>
    </div>
  );
}

export default IntegrationsPage;
