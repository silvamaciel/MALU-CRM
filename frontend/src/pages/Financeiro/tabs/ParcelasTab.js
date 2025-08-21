import React, { useEffect, useMemo, useState } from "react";
import {
  getFinanceiroDashboardApi,
  getParcelasApi,
} from "../../../api/financeiroApi";
import { toast } from "react-toastify";
import { FiSearch, FiDownload, FiCheckCircle } from "react-icons/fi";
import { formatCurrencyBRL, formatDateBR } from "../../../utils/currency";
import ModalBaixaPagamento from "../componentes/ModalBaixaPagamento";
import "./ParcelasTab.css";

export default function ParcelasTab() {
  // KPIs
  const [kpis, setKpis] = useState({
    totalAReceber: 0,
    recebidoNoMes: 0,
    totalVencido: 0,
  });

  // Tabela
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Filtros
  const [filters, setFilters] = useState({
    q: "",
    status: "",
    vencimentoDe: "",
    vencimentoAte: "",
  });

  // Modal baixa
  const [baixaOpen, setBaixaOpen] = useState(false);
  const [parcelaSelecionada, setParcelaSelecionada] = useState(null);

  // ======= API =======
  const fetchKpis = async () => {
    try {
      const data = await getFinanceiroDashboardApi();
      setKpis({
        totalAReceber: data?.totalAReceber || 0,
        recebidoNoMes: data?.recebidoNoMes || 0,
        totalVencido: data?.totalVencido || 0,
      });
    } catch {
      toast.error("Falha ao carregar KPIs.");
    }
  };

  // fallback leve no client (na página atual)
  const applyClientSideFallback = (list) => {
    let r = Array.isArray(list) ? [...list] : [];
    const { q, vencimentoDe, vencimentoAte, status } = filters;

    if (q) {
      const qn = q.toLowerCase().trim();
      r = r.filter((p) =>
        String(p?.sacado?.nome || "").toLowerCase().includes(qn)
      );
    }
    if (vencimentoDe) {
      const d = new Date(vencimentoDe);
      r = r.filter((p) => new Date(p?.dataVencimento) >= d);
    }
    if (vencimentoAte) {
      const d = new Date(vencimentoAte);
      r = r.filter((p) => new Date(p?.dataVencimento) <= d);
    }
    if (status) {
      r = r.filter((p) => String(p?.status || "") === status);
    }
    return r;
  };

  const fetchRows = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        q: filters.q || undefined,
        status: filters.status || undefined,
        vencimentoDe: filters.vencimentoDe || undefined,
        vencimentoAte: filters.vencimentoAte || undefined,

        // aliases (ok se o backend ignorar)
        search: filters.q || undefined,
        term: filters.q || undefined,
        startDue: filters.vencimentoDe || undefined,
        endDue: filters.vencimentoAte || undefined,
        statusParcela: filters.status || undefined,
      };

      const resp = await getParcelasApi(params);
      let data = Array.isArray(resp?.data) ? resp.data : [];
      const totalServer = Number.isFinite(resp?.total) ? resp.total : data.length;

      data = applyClientSideFallback(data);

      setRows(data);
      setTotal(totalServer);
    } catch {
      toast.error("Falha ao carregar parcelas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKpis();
  }, []);

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, JSON.stringify(filters)]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / limit)),
    [total, limit]
  );

  const abrirBaixa = (parcela) => {
    setParcelaSelecionada(parcela);
    setBaixaOpen(true);
  };

  return (
    <div className="parcelas-tab">
      {/* ===== KPIs ===== */}
      <div className="kpi-container">
        <div className="kpi-card kpi-info">
          <span className="kpi-label">Total a Receber</span>
          <span className="kpi-value">{formatCurrencyBRL(kpis.totalAReceber)}</span>
        </div>
        <div className="kpi-card kpi-success">
          <span className="kpi-label">Recebido no Mês</span>
          <span className="kpi-value">{formatCurrencyBRL(kpis.recebidoNoMes)}</span>
        </div>
        <div className="kpi-card kpi-danger">
          <span className="kpi-label">Total Vencido</span>
          <span className="kpi-value">{formatCurrencyBRL(kpis.totalVencido)}</span>
        </div>
      </div>

      {/* ===== FILTROS ===== */}
      <div className="filters-row">
        <div className="input-with-icon">
          <FiSearch />
          <input
            placeholder="Buscar por sacado/contrato"
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
          />
        </div>

        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
        >
          <option value="">Status</option>
          <option value="Pendente">Pendente</option>
          <option value="Pago">Pago</option>
          <option value="Atrasado">Atrasado</option>
        </select>

        <label>
          Venc. de
          <input
            type="date"
            value={filters.vencimentoDe}
            onChange={(e) =>
              setFilters((f) => ({ ...f, vencimentoDe: e.target.value }))
            }
          />
        </label>

        <label>
          Até
          <input
            type="date"
            value={filters.vencimentoAte}
            onChange={(e) =>
              setFilters((f) => ({ ...f, vencimentoAte: e.target.value }))
            }
          />
        </label>

        <button className="button" onClick={() => setPage(1)}>
          Filtrar
        </button>
        <button
          className="button secondary"
          onClick={() => {
            setFilters({ q: "", status: "", vencimentoDe: "", vencimentoAte: "" });
            setPage(1);
          }}
        >
          Limpar
        </button>
        <button className="button ghost">
          <FiDownload /> Exportar
        </button>
      </div>

      {/* ===== TABELA + PAGINAÇÃO (no mesmo card) ===== */}
      <div className="table-card" style={{ "--receber-offset": "340px" }}>
        <div className="table-scroll">
          <table className="table table-fixed">
            <colgroup>
              <col style={{ width: "24%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "10%" }} />
            </colgroup>

            <thead>
              <tr>
                <th>Sacado</th>
                <th>Tipo</th>
                <th>Vencimento</th>
                <th className="right">Valor Previsto</th>
                <th className="right">Pago</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center" }}>
                    Carregando…
                  </td>
                </tr>
              )}

              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center" }}>
                    Sem resultados
                  </td>
                </tr>
              )}

              {!loading &&
                rows.map((p) => (
                  <tr key={p._id}>
                    <td className="ellipsis" title={p.sacado?.nome || "-"}>
                      {p.sacado?.nome || "-"}
                    </td>
                    <td className="ellipsis" title={p.tipo || "-"}>
                      {p.tipo || "-"}
                    </td>
                    <td>{formatDateBR(p.dataVencimento)}</td>
                    <td className="money">{formatCurrencyBRL(p.valorPrevisto)}</td>
                    <td className="money">{formatCurrencyBRL(p.valorPago)}</td>
                    <td>
                      <span className={`tag tag-${(p.status || "").toLowerCase()}`}>
                        {p.status}
                      </span>
                    </td>
                    <td>
                      {p.status !== "Pago" && (
                        <button
                          className="button small primary"
                          onClick={() => abrirBaixa(p)}
                        >
                          <FiCheckCircle /> Baixa
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* paginação fixa dentro do card */}
        <div className="table-footer">
          <button
            className="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Anterior
          </button>
          <span>
            Página {page} de {Math.max(1, Math.ceil(total / limit))}
          </span>
          <button
            className="button"
            disabled={page >= Math.max(1, Math.ceil(total / limit))}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
          </button>
        </div>
      </div>

      {/* ===== MODAL BAIXA ===== */}
      <ModalBaixaPagamento
        open={baixaOpen}
        parcela={parcelaSelecionada}
        onClose={() => setBaixaOpen(false)}
        onSuccess={() => {
          fetchRows();
          fetchKpis();
        }}
      />
    </div>
  );
}
