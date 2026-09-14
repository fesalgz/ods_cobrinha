const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database/db');

// Configurar caminhos seguros baseados no userData do Electron
let userDataPath;
if (process.versions && process.versions.electron) {
    const { app } = require('electron');
    userDataPath = app.getPath('userData');
} else {
    userDataPath = path.resolve(__dirname, '..');
}
const uploadsPath = path.join(userDataPath, 'uploads');
const dbFilePath = path.join(userDataPath, 'database', 'sistema.db');

if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
}

// Configurando o Multer para upload de imagens
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsPath)
    },
    filename: function (req, file, cb) {
        // Renomear para logo.algumacoisa para facilidade ou usar original
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname))
    }
});
const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif|webp/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb('Erro: Apenas imagens são permitidas!');
        }
    }
});

// Página de Configurações da Identidade
router.get('/', (req, res) => {
    db.get('SELECT * FROM configuracoes WHERE id = 1', [], (err, config) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Erro ao carregar configurações.");
        }

        res.render('configuracoes', {
            title: 'Identidade do Sistema',
            config: config || {}
        });
    });
});

// Salvar Configurações da Identidade
router.post('/salvar', upload.single('logo'), (req, res) => {
    let { empresa_nome, empresa_endereco, empresa_telefone, normas_os } = req.body;
    let logo_path = null;

    if (req.file) {
        logo_path = '/uploads/' + req.file.filename;
    }

    if (logo_path) {
        db.run(
            `UPDATE configuracoes SET empresa_nome = ?, empresa_endereco = ?, empresa_telefone = ?, normas_os = ?, logo_path = ? WHERE id = 1`,
            [empresa_nome, empresa_endereco, empresa_telefone, normas_os, logo_path],
            (err) => {
                if (err) console.error(err);
                res.redirect('/configuracoes');
            }
        );
    } else {
        db.run(
            `UPDATE configuracoes SET empresa_nome = ?, empresa_endereco = ?, empresa_telefone = ?, normas_os = ? WHERE id = 1`,
            [empresa_nome, empresa_endereco, empresa_telefone, normas_os],
            (err) => {
                if (err) console.error(err);
                res.redirect('/configuracoes');
            }
        );
    }
});

module.exports = router;
