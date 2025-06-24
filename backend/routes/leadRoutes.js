const express = require('express');
const router = express.Router();
const LeadController = require('../controllers/LeadController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const { body, validationResult } = require('express-validator');
const multer = require('multer');

// Middleware to handle validation results
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
        return next();
    }
    const extractedErrors = [];
    errors.array().map(err => extractedErrors.push({ [err.path]: err.msg }));

    return res.status(400).json({
        errors: extractedErrors,
    });
};

const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});


router.get('/csv-template', LeadController.downloadCSVTemplateController);

router.post('/importar-csv', protect, authorize('admin'), (req, res, next) => {
    upload.single('csvfile')(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            // A Multer error occurred when uploading.
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ success: false, error: 'Arquivo CSV muito grande. O limite é de 5MB.' });
            }
            return res.status(400).json({ success: false, error: `Erro no upload do CSV: ${err.message}` });
        } else if (err) {
            // An unknown error occurred when uploading.
            return res.status(500).json({ success: false, error: `Erro desconhecido no upload: ${err.message}` });
        }
        // Everything went fine with multer, proceed to controller
        next();
    });
}, LeadController.importLeadsFromCSVController);


router.use(protect);

router.route('/')
    .get(LeadController.getLeads)
    .post(
        authorize('admin', 'corretor'), // Assuming both admin and corretor can create leads
        [
            body('nome').trim().notEmpty().withMessage('Nome é obrigatório.'),
            body('contato').trim().notEmpty().withMessage('Contato é obrigatório.'),
            // Add isMobilePhone for more specific validation if needed: .isMobilePhone('pt-BR')
            body('email').optional({ checkFalsy: true }).trim().isEmail().withMessage('Email inválido.').toLowerCase(),
            body('cpf').optional({ checkFalsy: true }).trim().custom((value) => {
                // Basic CPF format validation (numbers only, 11 digits)
                // For full validation, use a library like cpf-cnpj-validator, but that's usually in service/model
                if (value && !/^\d{11}$/.test(value.replace(/\D/g, ''))) {
                    throw new Error('CPF deve conter 11 dígitos numéricos.');
                }
                return true;
            }),
            body('situacao').optional().isMongoId().withMessage('ID de Situação inválido.'),
            body('origem').optional().isMongoId().withMessage('ID de Origem inválido.'),
            body('responsavel').optional().isMongoId().withMessage('ID de Responsável inválido.'),
            body('tags').optional().isArray().withMessage('Tags deve ser um array.'),
            body('tags.*').optional().isString().trim().toLowerCase(),
            body('coadquirentes').optional().isArray().withMessage('Coadquirentes deve ser um array.'),
            body('coadquirentes.*.nome').optional({ checkFalsy: true }).trim().notEmpty().withMessage('Nome do coadquirente é obrigatório se o coadquirente for fornecido.'),
            body('coadquirentes.*.email').optional({ checkFalsy: true }).trim().isEmail().withMessage('Email do coadquirente inválido.'),
            // Add more validations for other fields as needed
        ],
        validate, // Middleware to handle validation errors
        LeadController.createLead
    );

// Rota para o histórico de um lead específico
router.get('/:id/history', LeadController.getLeadHistory);

// Rota para descartar um lead
router.put('/descartar/:id', LeadController.descartarLead);

router.route('/:id')
    .get(LeadController.getLeadById)
    .put(
        authorize('admin', 'corretor'), // Assuming both can update
        [
            body('nome').optional().trim().notEmpty().withMessage('Nome não pode ser vazio se fornecido.'),
            body('email').optional({ checkFalsy: true }).trim().isEmail().withMessage('Email inválido.').toLowerCase(),
            body('cpf').optional({ checkFalsy: true }).trim().custom((value) => {
                if (value && !/^\d{11}$/.test(value.replace(/\D/g, ''))) {
                    throw new Error('CPF deve conter 11 dígitos numéricos.');
                }
                return true;
            }),
            body('situacao').optional().isMongoId().withMessage('ID de Situação inválido.'),
            body('motivoDescarte').optional().isMongoId().withMessage('ID de Motivo de Descarte inválido.'),
            // Add more validations for other updatable fields
        ],
        validate,
        LeadController.updateLead
    )
    .delete(authorize('admin'), LeadController.deleteLead);

module.exports = router;