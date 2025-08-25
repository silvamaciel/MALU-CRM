// src/pages/PropostaContrato/PropostaContratoDetailPage/PropostaContratoDetailPage.js
import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  getPropostaContratoByIdApi,
  downloadPropostaContratoPdfApi,
  updatePropostaContratoApi,
  updatePropostaContratoStatusApi,
  registrarDistratoApi,
  gerarEsalvarPdfApi,
  enviarParaAssinaturaApi
} from "../../../api/propostaContratoApi";

import { listarArquivosApi } from "../../../api/fileApi"; // <<< adicionado

import PrepararAssinaturaModal from '../../../components/PrepararAssinaturaModal/PrepararAssinaturaModal';
import "./PropostaContratoDetailPage.css";
import ConfirmModal from "../../../components/ConfirmModal/ConfirmModal";
import DiscardLeadModal from "../../../components/DiscardLeadModal/DiscardLeadModal";
import { getDiscardReasons } from "../../../api/discardReasons";
import GerarContratoModal from '../../../components/PropostaWizard/GerarContratoModal';
import SignatureStatusPanel from "./SignatureStatusPanel";

const STATUS_PROPOSTA_OPCOES = [
  "Em Elaboração",
  "Aguardando Aprovações",
  "Aguardando Assinatura Cliente",
  "Assinado",
  "Vendido",
  "Recusado",
  "Cancelado",
  "Distrato Realizado",
];

function PropostaContratoDetailPage() {
  const { propostaContratoId } = useParams();
  const navigate = useNavigate();

  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [arquivoContrato, setArquivoContrato] = useState(null); // mantém variável original

  const [propostaContrato, setPropostaContrato] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [confirmStatusModal, setConfirmStatusModal] = useState({
    isOpen: false,
    novoStatus: "",
    title: "",
    message: "",
  });

  const [isDistratoModalOpen, setIsDistratoModalOpen] = useState(false);
  const [motivosDescarte, setMotivosDescarte] = useState([]);
  const [isProcessingDistrato, setIsProcessingDistrato] = useState(false);
  const [distratoError, setDistratoError] = useState("");
  const [isSendingSignature, setIsSendingSignature] = useState(false);

  const [isGerarContratoModalOpen, setIsGerarContratoModalOpen] = useState(false);

  const fetchPropostaContrato = useCallback(async () => {
    if (!propostaContratoId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getPropostaContratoByIdApi(propostaContratoId);
      setPropostaContrato(data);

      // <<< NOVO: buscar arquivo do contrato associado (sem renomear variáveis)
      try {
        const files = await listarArquivosApi({
          categoria: 'Contratos',
          associations: JSON.stringify({ item: propostaContratoId })
        });
        if (files && files.length > 0) {
          setArquivoContrato(files[0]);
        } else {
          setArquivoContrato(null);
        }
      } catch (e) {
        // Não quebra fluxo caso Drive não responda; apenas loga
        console.warn("Falha ao listar arquivos do contrato:", e);
      }

    } catch (err) {
      const errorMsg =
        err.message || "Erro ao carregar dados da proposta/contrato.";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [propostaContratoId]);

  const handleSendSuccess = () => {
    setIsSignatureModalOpen(false);
    fetchPropostaContrato();
  };

  useEffect(() => {
    fetchPropostaContrato();
  }, [fetchPropostaContrato]);

  //Handler para Baixar Pdf (mantido)
  const handleDownloadPdf = async () => {
    if (!propostaContrato || !propostaContrato._id) return;
    setIsDownloadingPdf(true);
    toast.info("Gerando PDF, por favor aguarde...");
    try {
      const pdfBlob = await gerarEsalvarPdfApi(
        propostaContrato._id
      );

      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      const leadName =
        propostaContrato.lead?.nome?.replace(/\s+/g, "_") || "Lead";
      const unidadeId =
        propostaContrato.unidade?.identificador?.replace(/\s+/g, "_") ||
        propostaContrato.unidade?._id;
      link.setAttribute(
        "download",
        `Proposta_${leadName}_Unidade_${unidadeId}.pdf`
      );

      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Download do PDF iniciado!");
    } catch (err) {
      const errorMsg =
        err.error || err.message || "Falha ao gerar ou baixar o PDF.";
      toast.error(errorMsg);
      console.error("Erro no download do PDF:", err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleDownloadAndSavePdf = async () => {
    setIsDownloadingPdf(true);
    toast.info("A gerar e a salvar o PDF no Drive...");
    try {
      const pdfBlob = await gerarEsalvarPdfApi(propostaContrato._id); // mantém função original

      // Lógica de download (a mesma já existente)
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Contrato_${propostaContrato.lead?.nome}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);

      toast.success("PDF gerado e salvo no Drive com sucesso!");

      // >>> após salvar, re-busca dados para capturar novo arquivo (como no "novo")
      fetchPropostaContrato();
    } catch (err) {
      const errorMsg = err?.message || "Falha ao processar o PDF.";
      toast.error(errorMsg);
      console.error(err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleChangeStatus = async (novoStatus) => {
    if (
      !propostaContrato ||
      isUpdatingStatus ||
      propostaContrato.statusPropostaContrato === novoStatus
    )
      return;

    setConfirmStatusModal({
      isOpen: true,
      novoStatus: novoStatus,
      title: `Confirmar Mudança de Status para "${novoStatus}"`,
      message: `Você tem certeza que deseja alterar o status desta proposta/contrato para "${novoStatus}"? Esta ação pode atualizar o status do Lead e da Unidade associados.`,
    });
  };

  const handleConfirmStatusChange = async () => {
    const { novoStatus } = confirmStatusModal;
    if (!propostaContrato || !novoStatus) return;

    setIsUpdatingStatus(true);
    toast.info(`Atualizando status para ${novoStatus}...`);
    let dadosAdicionais = {};

    if (novoStatus === "Assinado") {
      const dataAssinatura = prompt(
        "Digite a data da assinatura (AAAA-MM-DD):",
        new Date().toISOString().split("T")[0]
      );
      if (!dataAssinatura) {
        setIsUpdatingStatus(false);
        setConfirmStatusModal({
          isOpen: false,
          novoStatus: "",
          title: "",
          message: "",
        });
        return;
      }
      dadosAdicionais.dataAssinaturaCliente = dataAssinatura;
    } else if (novoStatus === "Vendido") {
      const dataVenda = prompt(
        "Digite a data da venda efetivada (AAAA-MM-DD):",
        new Date().toISOString().split("T")[0]
      );
      if (!dataVenda) {
        setIsUpdatingStatus(false);
        setConfirmStatusModal({
          isOpen: false,
          novoStatus: "",
          title: "",
          message: "",
        });
        return;
      }
      dadosAdicionais.dataVendaEfetivada = dataVenda;
    }

    try {
      await updatePropostaContratoStatusApi(
        propostaContrato._id,
        novoStatus,
        dadosAdicionais
      );
      toast.success(
        `Status da Proposta/Contrato atualizado para "${novoStatus}"!`
      );
      fetchPropostaContrato(true);
    } catch (err) {
      toast.error(err.message || "Falha ao atualizar status.");
    } finally {
      setIsUpdatingStatus(false);
      setConfirmStatusModal({
        isOpen: false,
        novoStatus: "",
        title: "",
        message: "",
      });
    }
  };

  useEffect(() => {
    const fetchMotivos = async () => {
      try {
        const data = await getDiscardReasons();
        setMotivosDescarte(data || []);
      } catch (error) {
        console.error("Erro ao buscar motivos de descarte:", error);
        toast.error("Falha ao carregar motivos de descarte.");
      }
    };
    fetchMotivos();
  }, []);

  const handleOpenDistratoModal = () => {
    if (
      !propostaContrato ||
      propostaContrato.statusPropostaContrato !== "Vendido"
    ) {
      toast.warn(
        'Apenas propostas/contratos com status "Vendido" podem ser distratadas.'
      );
      return;
    }
    setDistratoError("");
    setIsDistratoModalOpen(true);
  };

  const handleCloseDistratoModal = () => {
    setIsDistratoModalOpen(false);
    setDistratoError("");
  };

  const handleConfirmDistrato = async (discardData) => {
    if (!propostaContrato) return;

    setIsProcessingDistrato(true);
    setDistratoError("");
    toast.info("Registrando distrato...");

    const motivoPrincipal =
      discardData.motivoTexto || "Distrato solicitado pelo cliente";
    const comentarioFinalDistrato = `${motivoPrincipal}${discardData.comentario
      ? "\nObservações Adicionais: " + discardData.comentario
      : ""
      }`;

    const dadosParaBackend = {
      novoStatus: "Distrato Realizado",
      motivoDistrato: comentarioFinalDistrato,
      dataDistrato: new Date().toISOString().split("T")[0],
      leadMotivoDescarteId: discardData.motivoDescarteId,
    };

    try {
      await registrarDistratoApi(propostaContrato._id, dadosParaBackend);
      toast.success("Distrato registrado com sucesso!");
      handleCloseDistratoModal();
      fetchPropostaContrato(true);
    } catch (err) {
      const errorMsg =
        err.error || err.message || "Falha ao registrar distrato.";
      setDistratoError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsProcessingDistrato(false);
    }
  };

  // Ações de status válidas (mantidas)
  let acoesDeStatusPermitidas = [];
  const statusAtual = propostaContrato?.statusPropostaContrato;

  if (statusAtual === "Em Elaboração") {
    acoesDeStatusPermitidas = [
      "Aguardando Aprovações",
      "Aguardando Assinatura Cliente",
      "Cancelado",
    ];
  } else if (statusAtual === "Aguardando Aprovações") {
    acoesDeStatusPermitidas = [
      "Aguardando Assinatura Cliente",
      "Recusado",
      "Cancelado",
    ];
  } else if (statusAtual === "Aguardando Assinatura Cliente") {
    acoesDeStatusPermitidas = ["Assinado", "Recusado", "Cancelado"];
  } else if (statusAtual === "Assinado") {
    acoesDeStatusPermitidas = ["Vendido", "Cancelado"];
  }

  const handleEnviarParaAssinatura = async () => {
    if (!propostaContrato) return;

    const confirmSend = window.confirm("Tem certeza que deseja enviar este contrato para assinatura? Esta ação não pode ser desfeita.");
    if (!confirmSend) return;

    setIsSendingSignature(true);
    toast.info("A preparar e a enviar o contrato para o Autentique...");
    try {
      await enviarParaAssinaturaApi(propostaContrato._id);
      toast.success("Contrato enviado para assinatura com sucesso!");
      fetchPropostaContrato();
    } catch (error) {
      toast.error(error.message || "Falha ao enviar para assinatura.");
    } finally {
      setIsSendingSignature(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-page loading">
        <p>Carregando Proposta/Contrato...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="admin-page error-page">
        <p className="error-message">{error}</p>
        <Link to="/reservas">Voltar para Reservas</Link>
      </div>
    );
  }
  if (!propostaContrato) {
    return (
      <div className="admin-page">
        <p>Proposta/Contrato não encontrada.</p>
        <Link to="/reservas">Voltar para Reservas</Link>
      </div>
    );
  }

  return (
    <div className="admin-page proposta-contrato-detail-page">
      <header className="page-header">
        <h1>Detalhes da Proposta/Contrato</h1>
        <div>
          <Link
            to="/reservas"
            className="button-link"
            style={{ marginRight: "10px" }}
          >
            Voltar para Reservas
          </Link>

          <Link
            to={`/propostas-contratos/${propostaContrato._id}/editar`}
            className="button-link-prime"
            style={{ marginRight: "10px" }}
          >
            Editar Proposta/Contrato
          </Link>

          <button onClick={() => setIsGerarContratoModalOpen(true)} className="button action-button">Gerar/Editar Documento </button>

          {/* Botão para baixar/gerar+salvar PDF (mantido, agora também reatualiza arquivos) */}
          <button
            onClick={handleDownloadAndSavePdf}
            className="button action-button"
            disabled={isDownloadingPdf}
            style={{ marginRight: "10px" }}
          >
            {isDownloadingPdf ? "Gerando PDF..." : "Baixar PDF"}
          </button>

          {(!propostaContrato.statusAssinatura || propostaContrato.statusAssinatura === 'Não Enviado') && (
            <button onClick={() => setIsSignatureModalOpen(true)} className="button primary-button">
              Preparar para Assinatura
            </button>
          )}
        </div>
      </header>

      <div
        className="status-actions-section"
        style={{
          padding: "15px",
          backgroundColor: "#f0f8ff",
          borderRadius: "6px",
          marginBottom: "20px",
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: "10px" }}>
          Situação Atual:{" "}
          <span
            className={`status-badge status-${String(statusAtual)
              .toLowerCase()
              .replace(/\s+/g, "-")}`}
          >
            {statusAtual}
          </span>
        </h3>
        {propostaContrato.statusPropostaContrato === "Vendido" && (
          <button
            onClick={handleOpenDistratoModal}
            className="button خطر-button small-button"
            disabled={isProcessingDistrato || isUpdatingStatus}
          >
            Registrar Distrato
          </button>
        )}
        <div
          className="status-buttons-container"
          style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}
        >
          {acoesDeStatusPermitidas.map((status) => (
            <button
              key={status}
              onClick={() => handleChangeStatus(status)}
              className="button small-button action-button"
              disabled={isUpdatingStatus}
            >
              Mover para: {status}
            </button>
          ))}
        </div>
        {isUpdatingStatus && (
          <p style={{ marginTop: "10px", fontStyle: "italic" }}>
            Atualizando status...
          </p>
        )}
      </div>

      <div className="page-content">
        <div className="info-section">
          <h3>Informações Gerais</h3>
          <p>
            <strong>Lead:</strong> {propostaContrato.lead?.nome || "N/A"}
          </p>
          <p>
            <strong>Imóvel:</strong>
            {propostaContrato.imovel?.identificador
              ? `${propostaContrato.imovel.identificador} (Empreendimento: ${propostaContrato.imovel?.empreendimento?.nome || "N/A"
              })`
              : propostaContrato.imovel?.titulo
                ? propostaContrato.imovel.titulo
                : "N/A"}
          </p>
          <p>
            <strong>Valor da Proposta:</strong>{" "}
            {propostaContrato.valorPropostaContrato?.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </p>
          <p>
            <strong>Status:</strong> {propostaContrato.statusPropostaContrato}
          </p>
          <p>
            <strong>Data da Proposta:</strong>{" "}
            {propostaContrato.dataProposta
              ? new Date(propostaContrato.dataProposta).toLocaleDateString(
                "pt-BR"
              )
              : "N/A"}
          </p>
          <p>
            <strong>Responsável pela Negociação:</strong>{" "}
            {propostaContrato.responsavelNegociacao?.nome || "N/A"}
          </p>
        </div>

        <div className="contrato-preview-section">
          <h3>Conteúdo do Contrato</h3>
          <div
            className="html-preview-container"
            dangerouslySetInnerHTML={{
              __html:
                propostaContrato.corpoContratoHTMLGerado ||
                "<p>Conteúdo do contrato não disponível.</p>",
            }}
          />
        </div>

        {propostaContrato.statusAssinatura !== 'Não Enviado' && (
          <SignatureStatusPanel
            status={propostaContrato.statusAssinatura}
            signatarios={propostaContrato.signatarios}
          />
        )}

        <ConfirmModal
          isOpen={confirmStatusModal.isOpen}
          onClose={() =>
            setConfirmStatusModal({
              isOpen: false,
              novoStatus: "",
              title: "",
              message: "",
            })
          }
          onConfirm={handleConfirmStatusChange}
          title={confirmStatusModal.title}
          message={confirmStatusModal.message}
          confirmText="Sim, Confirmar"
          isProcessing={isUpdatingStatus}
        />

        <DiscardLeadModal
          isOpen={isDistratoModalOpen}
          onClose={handleCloseDistratoModal}
          onSubmit={handleConfirmDistrato}
          leadName={`Proposta/Contrato para: ${propostaContrato?.lead?.nome || "Lead Desconhecido"
            }`}
          isProcessing={isProcessingDistrato}
          errorMessage={distratoError}
          discardReasons={motivosDescarte}
          initialComment={`Distrato referente à unidade ${propostaContrato?.unidade?.identificador} do empreendimento ${propostaContrato?.empreendimento?.nome}.`}
        />

        <PrepararAssinaturaModal
          isOpen={isSignatureModalOpen}
          onClose={() => setIsSignatureModalOpen(false)}
          contrato={propostaContrato}
          arquivoContrato={arquivoContrato} // agora populado via listarArquivosApi
          onSendSuccess={handleSendSuccess}
        />

        <GerarContratoModal
          isOpen={isGerarContratoModalOpen}
          onClose={() => setIsGerarContratoModalOpen(false)}
          proposta={propostaContrato}
          onSaveSuccess={fetchPropostaContrato}
        />
      </div>
    </div>
  );
}

export default PropostaContratoDetailPage;
