const AgendaEvento = require('../models/AgendaEvento');
const agendaService = require('../services/googleCalendarService');

// Lista eventos do usuário e empresa
const listarEventosLocais = async (req, res) => {
  try {
    const eventos = await AgendaEvento.find({
      companyId: req.user.company,
      userId: req.user._id,
    }).sort({ dataInicio: 1 });

    return res.json(eventos);
  } catch (error) {
    console.error('[AgendaController] Erro ao listar eventos:', error);
    return res.status(500).json({ error: 'Erro ao listar eventos' });
  }
};

// Salvar ou atualizar evento Google para o usuário
const saveOrUpdateEvento = async (googleEvent, user) => {
  const filtro = {
    googleEventId: googleEvent.id,
    userId: user._id,
    companyId: user.company,
  };

  const dados = {
    companyId: user.company,
    userId: user._id,
    titulo: googleEvent.summary || '(Sem título)',
    descricao: googleEvent.description || '',
    dataInicio: new Date(googleEvent.start.dateTime || googleEvent.start.date),
    dataFim: new Date(googleEvent.end.dateTime || googleEvent.end.date),
    origem: 'google',
    googleEventId: googleEvent.id,
  };

  await AgendaEvento.findOneAndUpdate(filtro, dados, { upsert: true, new: true });
};

// Sincroniza eventos do Google Agenda (exemplo simples)
const sincronizarEventosGoogle = async (req, res) => {
  try {
    const user = req.user;
    const qtd = await agendaService.sincronizarEventosGoogle(user);
    return res.json({ sincronizados: qtd });
  } catch (error) {
    console.error('[AgendaController] Erro na sincronização:', error);
    return res.status(500).json({ error: error.message || 'Falha na sincronização' });
  }
};


const criarEventoLocal = async (req, res) => {
  try {
    const { titulo, descricao, dataInicio, dataFim } = req.body;
    const companyId = req.user.company;
    const userId = req.user._id;

    const novoEvento = await agendaService.criarEventoLocal({
      companyId, userId, titulo, descricao, dataInicio, dataFim
    });

    return res.status(201).json(novoEvento);
  } catch (error) {
    console.error('[AgendaController] Erro ao criar evento local:', error);
    return res.status(500).json({ error: error.message || 'Erro ao criar evento' });
  }
};

module.exports = {
  listarEventosLocais,
  sincronizarEventosGoogle,
  criarEventoLocal,
  saveOrUpdateEvento
};
