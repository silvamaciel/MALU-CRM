const mongoose = require('mongoose');
const LeadRequest = require('../models/LeadRequest');
const Lead = require('../models/Lead');
const { findOrCreateOrigem } = require('../services/origemService');

exports.createPublic = async (req, res, next) => {
  try {
    // token do corretor → req.user.type === 'broker'
    const brokerId = req.user?._id;
    const companyId = req.user?.company || req.body.company;
    if (!brokerId || !companyId) return res.status(401).json({ error: 'token inválido' });

    const { nome, contato, email, comentario, corretorResponsavel } = req.body;
    if (!nome || !contato) return res.status(400).json({ error: 'nome e contato são obrigatórios' });

    const doc = await LeadRequest.create({
      company: companyId,
      nome, contato, email, comentario,
      corretorResponsavel: corretorResponsavel || brokerId,
      submittedByBroker: brokerId,
      status: 'Pendente',
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) { next(err); }
};

exports.listAdmin = async (req, res, next) => {
  try {
    const companyId = req.user?.company;
    const { status } = req.query; // Pendente|Aprovado|Rejeitado
    const q = { company: companyId };
    if (status) q.status = status;
    const rows = await LeadRequest.find(q).sort({ createdAt: -1 }).populate('corretorResponsavel');
    res.json(rows);
  } catch (err) { next(err); }
};

exports.reject = async (req, res, next) => {
  try {
    const { id } = req.params; const { reason } = req.body;
    const doc = await LeadRequest.findByIdAndUpdate(id, { status: 'Rejeitado', rejectReason: reason || null }, { new: true });
    if (!doc) return res.status(404).json({ error: 'Solicitação não encontrada' });
    res.json({ success: true, data: doc });
  } catch (err) { next(err); }
};

exports.approve = async (req, res, next) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.company;
    const doc = await LeadRequest.findById(id);
    if (!doc) return res.status(404).json({ error: 'Solicitação não encontrada' });
    if (doc.status !== 'Pendente') return res.status(400).json({ error: 'Solicitação não está pendente' });

    // origem default "Canal de parceria"
    const origem = await findOrCreateOrigem({ nome: 'Canal de parceria' }, companyId);

    // mapeamento mínimo → ajuste conforme seu Lead
    const payload = {
      company: companyId,
      nome: doc.nome,
      contato: doc.contato,
      email: doc.email,
      comentario: doc.comentario,
      origem: origem?._id,
      corretorResponsavel: doc.corretorResponsavel,
      submittedByBroker: doc.submittedByBroker,
      // defaults internos
      situacao: process.env.LEAD_STAGE_INBOX_ID, // ou busque do DB
      responsavel: req.user?._id, // opcional: quem aprovou
    };

    const lead = await Lead.create(payload);
    doc.status = 'Aprovado';
    await doc.save();

    res.json({ success: true, data: { leadId: lead._id, request: doc } });
  } catch (err) { next(err); }
};
