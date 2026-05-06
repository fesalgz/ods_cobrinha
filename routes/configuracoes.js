const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database/db');

// Configurando o Multer para upload de imagens
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/')
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

// Página de Configurações
router.get('/', (req, res) => {
    db.get('SELECT * FROM configuracoes WHERE id = 1', [], (err, config) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Erro ao carregar configurações.");
        }

        let dbSize = "Desconhecido";
        try {
            const dbPath = path.join(__dirname, '../database/sistema.db');
            if (fs.existsSync(dbPath)) {
                const stats = fs.statSync(dbPath);
                const sizeInBytes = stats.size;
                if (sizeInBytes < 1024 * 1024) {
                    dbSize = (sizeInBytes / 1024).toFixed(2) + " KB";
                } else {
                    dbSize = (sizeInBytes / (1024 * 1024)).toFixed(2) + " MB";
                }
            }
        } catch (e) {
            console.error("Erro ao ler tamanho do DB", e);
        }

        res.render('configuracoes', {
            title: 'Configurações do Sistema',
            config: config || {},
            dbSize: dbSize
        });
    });
});

// Salvar Configurações
router.post('/salvar', upload.single('logo'), (req, res) => {
    let { empresa_nome, empresa_endereco, empresa_telefone, tema_escuro } = req.body;
    let logo_path = null;

    // Converte de "on" (checkbox marcado) para 1, caso contrário 0
    tema_escuro = tema_escuro ? 1 : 0;

    if (req.file) {
        logo_path = '/uploads/' + req.file.filename;
    }

    // Se uma nova logo foi enviada, atualiza com a logo
    if (logo_path) {
        db.run(
            `UPDATE configuracoes SET empresa_nome = ?, empresa_endereco = ?, empresa_telefone = ?, tema_escuro = ?, logo_path = ? WHERE id = 1`,
            [empresa_nome, empresa_endereco, empresa_telefone, tema_escuro, logo_path],
            (err) => {
                if (err) console.error(err);
                res.redirect('/configuracoes');
            }
        );
    } else {
        // Se nenhuma logo foi enviada, ignora a coluna logo_path
        db.run(
            `UPDATE configuracoes SET empresa_nome = ?, empresa_endereco = ?, empresa_telefone = ?, tema_escuro = ? WHERE id = 1`,
            [empresa_nome, empresa_endereco, empresa_telefone, tema_escuro],
            (err) => {
                if (err) console.error(err);
                res.redirect('/configuracoes');
            }
        );
    }
});

// Download do Banco de Dados
router.get('/backup', (req, res) => {
    const dbPath = path.join(__dirname, '../database/sistema.db');
    res.download(dbPath, 'backup_sistema.db', (err) => {
        if (err) {
            console.error("Erro ao baixar backup:", err);
            res.status(500).send("Erro ao baixar arquivo do banco.");
        }
    });
});

// Limpar Ordens de Serviço
router.post('/limpar-os', (req, res) => {
    db.run("DELETE FROM ordens", (err) => {
        if (err) {
            console.error("Erro ao deletar OS:", err);
            return res.status(500).send("Erro ao deletar ordens.");
        }
        db.run("VACUUM", (err) => { // Optimizes sqlite size after large deletes
            if (err) console.error("Erro no VACUUM apos limpar OS:", err);
            res.redirect('/configuracoes');
        });
    });
});

// Limpar TODOS os Clientes
router.post('/limpar-clientes', (req, res) => {
    db.run("DELETE FROM clientes", (err) => {
        if (err) {
            console.error("Erro ao deletar Clientes:", err);
            return res.status(500).send("Erro ao deletar clientes.");
        }
        db.run("VACUUM", (err) => {
            if (err) console.error("Erro no VACUUM apos limpar clientes:", err);
            res.redirect('/configuracoes');
        });
    });
});

// Restaurar Banco de Dados (Upload)
const uploadDb = multer({ dest: 'public/uploads/' }); // Salva temp na pasta de uploads

router.post('/restaurar', uploadDb.single('banco'), (req, res) => {
    if (!req.file) {
        return res.status(400).send("Nenhum arquivo enviado ou erro no upload.");
    }

    const tempPath = req.file.path;
    const targetPath = path.join(__dirname, '../database/sistema.db');

    // Fechar a conexão do banco primeiro para o Windows permitir a substituição do arquivo
    db.close((err) => {
        if (err) {
            console.error("Erro ao fechar banco de dados para restauração:", err);
        }

        // Substituir o arquivo do banco antigo pelo novo arquivo enviado
        fs.copyFile(tempPath, targetPath, (copyErr) => {
            // Apaga o arquivo temporário
            fs.unlink(tempPath, () => { });

            if (copyErr) {
                console.error("Erro ao sobrescrever o arquivo de banco de dados:", copyErr);
                return res.status(500).send("Falha ao restaurar o banco de dados. " + copyErr.message);
            }

            // Exibir a tela de sucesso para o usuário com a instrução de reiniciar
            res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Restauração Concluída</title>
                    <style>
                        body { font-family: Arial, sans-serif; background-color: #f8d7da; color: #721c24; text-align: center; padding: 50px; }
                        h1 { font-size: 30px; }
                        .box { background: white; padding: 30px; border-radius: 10px; display: inline-block; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                    </style>
                </head>
                <body>
                    <div class="box">
                        <h1>✅ Backup Restaurado com Sucesso!</h1>
                        <h2>O sistema foi desligado por segurança.</h2>
                        <p>Por favor, <strong>feche completamente a janela preta (terminal)</strong> do servidor.</p>
                        <p>Em seguida, abra o arquivo <strong>iniciar.bat</strong> novamente para ligar o sistema com seus dados restaurados.</p>
                    </div>
                </body>
                </html>
            `);

            // Desligar o processo do Node (garante que tudo inicie do zero)
            setTimeout(() => {
                process.exit(0);
            }, 2000);
        });
    });
});
module.exports = router;
