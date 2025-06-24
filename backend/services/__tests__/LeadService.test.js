// backend/services/__tests__/LeadService.test.js
const mongoose = require('mongoose');
const LeadService = require('../LeadService');
const Lead = require('../../models/Lead');
const LeadStage = require('../../models/LeadStage');
const Origem = require('../../models/origem');
const User = require('../../models/User');
const { getDefaultLeadStageIdForCompany, getDefaultAdminUserIdForCompany } = require('../LeadService'); // For mocking
const origemService = require('../origemService');

// Mock models and dependencies
jest.mock('../../models/Lead');
jest.mock('../../models/LeadStage');
jest.mock('../../models/Origem');
jest.mock('../../models/User');
jest.mock('../origemService');
// jest.mock('../LeadService', () => {
//   const originalModule = jest.requireActual('../LeadService');
//   return {
//     ...originalModule,
//     logHistory: jest.fn().mockResolvedValue(undefined), // Mock only logHistory
//     // getDefaultLeadStageIdForCompany: jest.fn(), // Keep if needed for setup
//     // getDefaultAdminUserIdForCompany: jest.fn(), // Keep if needed for setup
//   };
// });
// More granular mock for logHistory if it's part of the same module and causes issues
const actualLeadService = jest.requireActual('../LeadService');
LeadService.logHistory = jest.fn().mockResolvedValue(undefined);


describe('LeadService', () => {
  const companyId = new mongoose.Types.ObjectId().toString();
  const userId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    // Clear all instances and calls to constructor and all methods:
    Lead.mockClear();
    LeadStage.mockClear();
    Origem.mockClear();
    User.mockClear();
    origemService.findOrCreateOrigem.mockClear();
    LeadService.logHistory.mockClear();

    // Default mock implementations
    Lead.findOne.mockResolvedValue(null); // No duplicates by default
    Lead.prototype.save = jest.fn().mockResolvedValue(this);

    LeadStage.findOne.mockImplementation((query) => {
      if (query.nome && query.nome.$regex && query.nome.$regex.source.includes("Novo")) {
        return Promise.resolve({ _id: new mongoose.Types.ObjectId(), nome: 'Novo', company: companyId, ordem: 0, ativo: true });
      }
      return Promise.resolve(null);
    });

    Origem.findOne.mockResolvedValue({ _id: new mongoose.Types.ObjectId(), nome: 'Sistema Gestor', company: companyId });
    origemService.findOrCreateOrigem.mockResolvedValue({ _id: new mongoose.Types.ObjectId(), nome: 'Sistema Gestor', company: companyId });

    User.findOne.mockImplementation((query) => {
      if (query.company === companyId && query.perfil === 'admin') {
        return Promise.resolve({ _id: userId, nome: 'Admin User' });
      }
      return Promise.resolve(null);
    });
  });

  describe('createLead', () => {
    const validLeadData = {
      nome: 'Test Lead',
      contato: '+5511999998888',
      email: 'test@example.com',
      company: companyId,
      responsavel: userId,
      // situacao and origem will be resolved by mocks or defaults
    };

    it('should create a lead successfully with valid data', async () => {
      const savedLeadInstance = {
        ...validLeadData,
        _id: new mongoose.Types.ObjectId(),
        contato: '+5511999998888', // Assuming phoneUtil formats it
        email: 'test@example.com',
        situacao: new mongoose.Types.ObjectId(),
        origem: new mongoose.Types.ObjectId(),
        responsavel: userId,
        company: companyId,
        toObject: function() { return this; } // Mock toObject for logHistory
      };
      Lead.prototype.save = jest.fn().mockResolvedValue(savedLeadInstance);

      const lead = await LeadService.createLead(validLeadData, companyId, userId);

      expect(Lead).toHaveBeenCalledTimes(1);
      expect(Lead.prototype.save).toHaveBeenCalledTimes(1);
      expect(lead.nome).toBe(validLeadData.nome);
      expect(lead.contato).toBe(validLeadData.contato); // Assuming direct pass-through for now
      expect(LeadService.logHistory).toHaveBeenCalledWith(lead._id, userId, 'CRIACAO', expect.any(String), null, expect.any(Object), 'Lead', lead._id);
    });

    it('should throw an error if nome is missing', async () => {
      const leadData = { ...validLeadData, nome: '' };
      await expect(LeadService.createLead(leadData, companyId, userId))
        .rejects
        .toThrow('Nome e Contato são obrigatórios.');
    });

    it('should throw an error if contato is missing', async () => {
      const leadData = { ...validLeadData, contato: '' };
      await expect(LeadService.createLead(leadData, companyId, userId))
        .rejects
        .toThrow('Nome e Contato são obrigatórios.');
    });

    it('should throw an error if contato format is invalid', async () => {
        const leadData = { ...validLeadData, contato: 'invalid-phone' };
        await expect(LeadService.createLead(leadData, companyId, userId))
          .rejects
          .toThrow('Formato de contato não reconhecido: invalid-phone');
      });

    it('should throw an error if CPF is invalid', async () => {
        const leadData = { ...validLeadData, cpf: '12345678900' }; // Invalid CPF
        await expect(LeadService.createLead(leadData, companyId, userId))
            .rejects
            .toThrow('CPF inválido: 12345678900');
    });

    it('should throw an error if a lead with the same contato already exists for the company', async () => {
      Lead.findOne.mockResolvedValueOnce({ // Simulate finding a duplicate by contato
        _id: new mongoose.Types.ObjectId(),
        nome: 'Existing Lead',
        contato: '+5511999998888',
        company: companyId,
      });
      const leadData = { ...validLeadData, contato: '+5511999998888' };
      await expect(LeadService.createLead(leadData, companyId, userId))
        .rejects
        .toThrow(`Já existe um lead com estes dados: Telefone (${leadData.contato}).`);
    });

    it('should throw an error if a lead with the same email already exists for the company', async () => {
        Lead.findOne.mockResolvedValueOnce({ // Simulate finding a duplicate by email
          _id: new mongoose.Types.ObjectId(),
          nome: 'Existing Lead',
          email: 'test@example.com',
          company: companyId,
        });
        const leadData = { ...validLeadData, email: 'test@example.com' };
        await expect(LeadService.createLead(leadData, companyId, userId))
          .rejects
          .toThrow(`Já existe um lead com estes dados: Email (${leadData.email}).`);
      });

    it('should assign default situacao if not provided', async () => {
        const defaultStageId = new mongoose.Types.ObjectId();
        LeadStage.findOne.mockImplementation((query) => { // More specific mock for this test
            if (query.nome && query.nome.$regex && query.nome.$regex.source.includes("Novo") && query.company === companyId) {
              return Promise.resolve({ _id: defaultStageId, nome: 'Novo', company: companyId, ordem: 0, ativo: true });
            }
            return Promise.resolve(null);
        });
        const leadData = { ...validLeadData, situacao: undefined };
        const savedLeadInstance = { ...leadData, _id: new mongoose.Types.ObjectId(), situacao: defaultStageId, toObject: function() { return this; }};
        Lead.prototype.save = jest.fn().mockResolvedValue(savedLeadInstance);

        const lead = await LeadService.createLead(leadData, companyId, userId);
        expect(lead.situacao.toString()).toBe(defaultStageId.toString());
    });

    it('should assign default origem if not provided', async () => {
        const defaultOrigemId = new mongoose.Types.ObjectId();
        origemService.findOrCreateOrigem.mockResolvedValue({ _id: defaultOrigemId, nome: 'Sistema Gestor' });

        const leadData = { ...validLeadData, origem: undefined };
        const savedLeadInstance = { ...leadData, _id: new mongoose.Types.ObjectId(), origem: defaultOrigemId, toObject: function() { return this; }};
        Lead.prototype.save = jest.fn().mockResolvedValue(savedLeadInstance);

        const lead = await LeadService.createLead(leadData, companyId, userId);
        expect(lead.origem.toString()).toBe(defaultOrigemId.toString());
    });

    it('should assign default responsavel (admin) if not provided and userId is not admin', async () => {
        const adminUserId = new mongoose.Types.ObjectId();
        User.findOne.mockImplementation((query) => { // Mock for getDefaultAdminUserIdForCompany
            if(query.company === companyId && query.perfil === 'admin') {
                return Promise.resolve({ _id: adminUserId });
            }
            return Promise.resolve(null);
        });

        const leadData = { ...validLeadData, responsavel: undefined };
        const currentUserId = new mongoose.Types.ObjectId(); // Non-admin user creating
        const savedLeadInstance = { ...leadData, _id: new mongoose.Types.ObjectId(), responsavel: adminUserId, toObject: function() { return this; }};
        Lead.prototype.save = jest.fn().mockResolvedValue(savedLeadInstance);

        const lead = await LeadService.createLead(leadData, companyId, currentUserId);
        expect(lead.responsavel.toString()).toBe(adminUserId.toString());
    });


    it('should use provided userId as responsavel if responsavel field is not in leadData', async () => {
        const creatorUserId = new mongoose.Types.ObjectId().toString();
        const leadData = { ...validLeadData, responsavel: undefined }; // responsavel not in input data

        const savedLeadInstance = { ...leadData, _id: new mongoose.Types.ObjectId(), responsavel: creatorUserId, toObject: function() { return this; }};
        Lead.prototype.save = jest.fn().mockResolvedValue(savedLeadInstance);

        // Mock getDefaultAdminUserIdForCompany to return null to ensure creatorUserId is used if responsavel is not passed
        const actualLeadServiceNoAdmin = jest.requireActual('../LeadService');
        const originalGetDefaultAdmin = actualLeadServiceNoAdmin.getDefaultAdminUserIdForCompany;
        actualLeadServiceNoAdmin.getDefaultAdminUserIdForCompany = jest.fn().mockResolvedValue(null);

        const lead = await LeadService.createLead(leadData, companyId, creatorUserId);

        expect(lead.responsavel.toString()).toBe(creatorUserId);

        // Restore original function if necessary for other tests, or manage mocks per test
        actualLeadServiceNoAdmin.getDefaultAdminUserIdForCompany = originalGetDefaultAdmin;
      });
  });

  // TODO: Add describe blocks and tests for updateLead, descartarLead, etc.
  // For updateLead:
  // - Test successful update.
  // - Test updating situacao to "Descartado" requires motivoDescarte.
  // - Test updating situacao from "Em Reserva" to something else cancels the active Reserva.
  // - Test duplicate checks on update (email, contato, cpf).
  //
  // For descartarLead:
  // - Test successful discard.
  // - Test that situacao is set to "Descartado" (or its ID).
  // - Test that motivoDescarte is set.
});
