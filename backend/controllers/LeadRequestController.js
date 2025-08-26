const mongoose = require('mongoose');
const LeadRequest = require('../models/LeadRequest');
const Lead = require('../models/Lead');
const LeadStage = require('../models/LeadStage');
const { findOrCreateOrigem } = require('../services/origemService');

// >>> IMPORTANTE: importar a migração do FileService
const { migrateAssociationsFromLeadRequestToLead } = require('../services/FileService');

exports.createPublic = async (req, res, next) => {
  try {
    // token do corretor → req.user.type === 'broker'
    const {
      company, corretorResponsavel,
      nome, contato, email, comentario,
      nascimento, endereco, cpf, rg, nacionalidade, estadoCivil, profissao,
      coadquirentes, tags
    } = req.body;

    if (!company) return res.status(400).json({ error: 'company é obrigatório' });
    if (!corretorResponsavel) return res.status(400).json({ error: 'corretorResponsavel é obrigatório' });
    if (!nome || !contato) return res.status(400).json({ error: 'nome e contato são obrigatórios' });

    // normalizações leves (evita null/undefined poluindo doc)
    const doc = await LeadRequest.create({
      company,
      nome,
      contato,
      email: email || undefined,
      comentario: comentario || undefined,
      nascimento: nascimento || undefined,
      endereco: endereco || undefined,
      cpf: (cpf || '').replace(/\D/g, '') || undefined,
      rg: rg || undefined,
      nacionalidade: nacionalidade || undefined,
      estadoCivil: estadoCivil || undefined,
      profissao: profissao || undefined,
      coadquirentes: Array.isArray(coadquirentes) ? coadquirentes : [],
      tags: Array.isArray(tags) ? tags : [],
      corretorResponsavel,
      submittedByBroker: corretorResponsavel,
      status: 'Pendente',
    });

    return res.status(201).json({
      success: true,
      data: { _id: doc._id, status: doc.status }
    });
  } catch (err) { next(err); }
};

exports.listAdmin = async (req, res, next) => {
  try {
    const companyId = req.user?.company;
    const { status } = req.query; // Pendente|Aprovado|Rejeitado
    const q = { company: companyId };
    if (status) q.status = status;
    const rows = await LeadRequest
      .find(q)
      .sort({ createdAt: -1 })
      .populate('corretorResponsavel', 'nome')
      .lean();
    return res.json(rows);
  } catch (err) { next(err); }
};

exports.reject = async (req, res, next) => {
  try {
    const { id } = req.params; const { reason } = req.body;
    const doc = await LeadRequest.findByIdAndUpdate(
      id,
      { status: 'Rejeitado', rejectReason: reason || null },
      { new: true }
    );
    if (!doc) return res.status(404).json({ error: 'Solicitação não encontrada' });
    return res.json({ success: true, data: doc });
  } catch (err) { next(err); }
};

exports.approve = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;
    const companyId = req.user?.company;

    const doc = await LeadRequest.findById(id).session(session);
    if (!doc) {
      await session.abortTransaction(); session.endSession();
      return res.status(404).json({ error: 'Solicitação não encontrada' });
    }
    if (doc.status !== 'Pendente') {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({ error: 'Solicitação não está pendente' });
    }

    // origem default "Canal de parceria"
    const origem = await findOrCreateOrigem({ nome: 'Canal de parceria' }, companyId);

    const firstStage = await LeadStage
      .findOne({ company: companyId })
      .sort({ ordem: 1, createdAt: 1 })
      .select('_id')
      .session(session);

    if (!firstStage) {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({ error: 'Nenhuma etapa (LeadStage) cadastrada para a empresa.' });
    }

    // monta payload do Lead
    const payload = {
      company: companyId,
      nome: doc.nome,
      contato: doc.contato,
      email: doc.email || undefined,
      comentario: doc.comentario || undefined,
      nascimento: doc.nascimento || undefined,
      endereco: doc.endereco || undefined,
      cpf: (doc.cpf || '').replace(/\D/g, '') || undefined,
      rg: doc.rg || undefined,
      nacionalidade: doc.nacionalidade || undefined,
      estadoCivil: doc.estadoCivil || undefined,
      profissao: doc.profissao || undefined,
      coadquirentes: Array.isArray(doc.coadquirentes) ? doc.coadquirentes : [],
      tags: Array.isArray(doc.tags) ? doc.tags : [],
      origem: origem?._id,
      corretorResponsavel: doc.corretorResponsavel,
      submittedByBroker: doc.submittedByBroker,
      // defaults internos
      situacao: firstStage._id,
      responsavel: req.user?._id,
    };

    const lead = await Lead.create([payload], { session });
    const leadId = lead[0]._id;

    // marca request como aprovado
    doc.status = 'Aprovado';
    doc.rejectReason = null;
    await doc.save({ session });


    await session.commitTransaction();
    session.endSession();

    let filesMigration = { moved: 0 };
    try {
      filesMigration = await migrateAssociationsFromLeadRequestToLead(id, leadId, companyId);
    } catch (e) {
      // logue o erro no seu logger central
      filesMigration = { moved: 0, error: 'file_migration_failed' };
    }

    return res.json({
      success: true,
      data: {
        leadId,
        request: { _id: doc._id, status: doc.status },
        filesMigration
      }
    });
  } catch (err) {
    try { await session.abortTransaction(); } catch (_) {}
    session.endSession();
    next(err);
  }
};
