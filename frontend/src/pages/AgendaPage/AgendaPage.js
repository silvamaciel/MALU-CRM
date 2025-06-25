import React, { useState, useEffect } from "react";
import { getEventosAgenda, criarEventoAgenda, deletarEventoAgenda } from "../api/agendaApi";
import './AgendaPage.css';

const AgendaPage = () => {
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState({
    titulo: "",
    descricao: "",
    dataInicio: "",
    dataFim: ""
  });
  const [error, setError] = useState("");

  useEffect(() => {
    fetchEventos();
  }, []);

  const fetchEventos = async () => {
    setLoading(true);
    try {
      const data = await getEventosAgenda();
      setEventos(data);
    } catch (err) {
      alert("Erro ao carregar eventos: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const abrirModal = () => {
    setForm({ titulo: "", descricao: "", dataInicio: "", dataFim: "" });
    setError("");
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const validarForm = () => {
    if (!form.titulo.trim()) return "Título é obrigatório";
    if (!form.dataInicio) return "Data e hora de início são obrigatórios";
    if (!form.dataFim) return "Data e hora de fim são obrigatórios";
    if (new Date(form.dataFim) <= new Date(form.dataInicio)) return "Data e hora de fim devem ser posteriores à data de início";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const erro = validarForm();
    if (erro) {
      setError(erro);
      return;
    }
    try {
      await criarEventoAgenda({
        titulo: form.titulo,
        descricao: form.descricao,
        dataInicio: new Date(form.dataInicio).toISOString(),
        dataFim: new Date(form.dataFim).toISOString(),
      });
      await fetchEventos();
      fecharModal();
    } catch (err) {
      setError(err.message || "Falha ao criar evento.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Confirma exclusão do evento?")) return;
    try {
      await deletarEventoAgenda(id);
      setEventos((evs) => evs.filter((ev) => ev._id !== id));
    } catch (err) {
      alert("Erro ao excluir evento: " + (err.message || err));
    }
  };

  return (
    <div className="container">
      <h1>Agenda</h1>
      <button onClick={abrirModal}>Novo Evento</button>

      {loading ? (
        <p>Carregando eventos...</p>
      ) : eventos.length === 0 ? (
        <p>Nenhum evento encontrado.</p>
      ) : (
        <ul className="event-list">
          {eventos.map((ev) => (
            <li key={ev._id} className="event-item">
              <strong>{ev.titulo}</strong>
              <br />
              <small>{new Date(ev.dataInicio).toLocaleString()} - {new Date(ev.dataFim).toLocaleString()}</small>
              <p>{ev.descricao}</p>
              <button className="delete-btn" onClick={() => handleDelete(ev._id)}>Excluir</button>
            </li>
          ))}
        </ul>
      )}

      {modalAberto && (
        <div className="modal-overlay" onClick={fecharModal}>
          <form
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSubmit}
          >
            <h2>Novo Evento</h2>

            {error && <div className="error-msg">{error}</div>}

            <label htmlFor="titulo">Título</label>
            <input
              type="text"
              id="titulo"
              name="titulo"
              value={form.titulo}
              onChange={handleChange}
              autoFocus
            />

            <label htmlFor="descricao">Descrição</label>
            <textarea
              id="descricao"
              name="descricao"
              value={form.descricao}
              onChange={handleChange}
            />

            <label htmlFor="dataInicio">Data e Hora Início</label>
            <input
              type="datetime-local"
              id="dataInicio"
              name="dataInicio"
              value={form.dataInicio}
              onChange={handleChange}
            />

            <label htmlFor="dataFim">Data e Hora Fim</label>
            <input
              type="datetime-local"
              id="dataFim"
              name="dataFim"
              value={form.dataFim}
              onChange={handleChange}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" onClick={fecharModal} style={{ marginRight: '10px' }}>
                Cancelar
              </button>
              <button type="submit">Salvar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AgendaPage;
