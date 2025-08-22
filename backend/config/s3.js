const { S3Client } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');

// 1. Configura o cliente S3 para se conectar ao DigitalOcean Spaces
const s3Client = new S3Client({
    endpoint: process.env.SPACES_ENDPOINT,
    region: 'us-east-1', // Esta região é padrão para o S3, mesmo que o seu Space esteja noutro local
    credentials: {
        accessKeyId: process.env.SPACES_KEY,
        secretAccessKey: process.env.SPACES_SECRET
    }
});

// 2. Configura o 'storage engine' do Multer para fazer o upload diretamente para o Space
const upload = multer({
    storage: multerS3({
        s3: s3Client,
        bucket: process.env.SPACES_BUCKET_NAME,
        acl: 'public-read', // Torna os ficheiros publicamente legíveis por defeito
        metadata: function (req, file, cb) {
            cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
            // Define o nome do ficheiro no Space, incluindo a pasta da empresa
            const path = `company-${req.user.company}/${Date.now().toString()}-${file.originalname}`;
            cb(null, path);
        }
    })
});

module.exports = { upload, s3Client };