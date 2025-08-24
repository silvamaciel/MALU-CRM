export const CATEGORIAS = [
'Contratos',
'Documentos Leads',
'Materiais Empreendimentos',
'Recibos',
'Identidade Visual',
'Mídia WhatsApp',
'Outros',
];


// Configurações por categoria para o UploadModal
export const CATEGORY_META = {
'Materiais Empreendimentos': {
requiresAssociation: true,
association: { kind: 'Empreendimento', label: 'Empreendimento' },
subfolders: ['Imagens', 'Plantas'], // subpastas visuais
showFolderView: true, // habilita grid de pastas por empreendimento
},
'Documentos Leads': {
requiresAssociation: true,
association: { kind: 'Lead', label: 'Lead' },
subfolders: ['Documentos'], // fixa em Documentos (única)
showFolderView: false,
},
'Contratos': {
requiresAssociation: true,
association: { kind: 'PropostaContrato', label: 'Proposta/Contrato' },
subfolders: null, // não precisa subpasta
showFolderView: false,
},
'Recibos': {
requiresAssociation: true,
association: { kind: 'Parcela', label: 'Parcela' },
subfolders: null,
showFolderView: false,
},
'Identidade Visual': {
requiresAssociation: false, // atrelado só à company atual
association: null,
subfolders: null,
showFolderView: false,
},
'Mídia WhatsApp': {
requiresAssociation: false,
association: null,
subfolders: null,
showFolderView: false,
},
'Outros': {
requiresAssociation: false,
association: null,
subfolders: null,
showFolderView: false,
},
};