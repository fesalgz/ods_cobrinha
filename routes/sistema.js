const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database/db');

let userDataPath;
if (process.versions && process.versions.electron) {
    const { app } = require('electron');
    userDataPath = app.getPath('userData');
} else {
    userDataPath = path.resolve(__dirname, '..');
}
const uploadsPath = path.join(userDataPath, 'uploads');
const dbFilePath = path.join(userDataPath, 'database', 'sistema.db');

const verificarAutenticacaoConfig = (req, res, next) => {
    if (req.session && req.session.configAuthenticated) {
        return next();
    }
    res.render('sistema-login', {
        title: 'Acesso Restrito',
        error: req.query.error || null
    });
};

router.post('/login', (req, res) => {
    const { senha } = req.body;
    db.get('SELECT senha_painel FROM configuracoes WHERE id = 1', [], (err, row) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Erro no servidor.");
        }
        const senhaCorreta = row ? row.senha_painel : 'admin';
        if (senha === senhaCorreta) {
            req.session.configAuthenticated = true;
            return res.redirect('/sistema');
        } else {
            return res.render('sistema-login', {
                title: 'Acesso Restrito',
                error: 'Senha incorreta. Tente novamente.'
            });
        }
    });
});

router.post('/alterar-senha', verificarAutenticacaoConfig, (req, res) => {
    const { senha_atual, nova_senha, confirmar_senha } = req.body;

    db.get('SELECT senha_painel FROM configuracoes WHERE id = 1', [], (err, row) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Erro ao buscar senha atual.");
        }

        const senhaCorreta = row ? row.senha_painel : 'admin';

        if (senha_atual !== senhaCorreta) {
            return res.redirect('/sistema?error_senha=A senha atual está incorreta.');
        }

        if (nova_senha !== confirmar_senha) {
            return res.redirect('/sistema?error_senha=A nova senha e a confirmação não coincidem.');
        }

        if (nova_senha.length < 3) {
            return res.redirect('/sistema?error_senha=A nova senha deve ter no mínimo 3 caracteres.');
        }

        db.run('UPDATE configuracoes SET senha_painel = ? WHERE id = 1', [nova_senha], (updateErr) => {
            if (updateErr) {
                console.error(updateErr);
                return res.status(500).send("Erro ao alterar senha.");
            }
            res.redirect('/sistema?success_senha=Senha alterada com sucesso!');
        });
    });
});

// Página principal do Sistema
router.get('/', verificarAutenticacaoConfig, (req, res) => {
    db.get('SELECT * FROM configuracoes WHERE id = 1', [], (err, config) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Erro ao carregar configurações.");
        }

        let dbSize = "Desconhecido";
        try {
            if (fs.existsSync(dbFilePath)) {
                const stats = fs.statSync(dbFilePath);
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

        res.render('sistema', {
            title: 'Configurações do Sistema',
            config: config || {},
            dbSize: dbSize,
            errorSenha: req.query.error_senha || null,
            successSenha: req.query.success_senha || null,
            successMsg: req.query.success || null
        });
    });
});

// Salvar Nome do Sistema (Menu Lateral)
router.post('/salvar-nome', verificarAutenticacaoConfig, (req, res) => {
    const { nome_sistema } = req.body;
    db.run(
        `UPDATE configuracoes SET nome_sistema = ? WHERE id = 1`,
        [nome_sistema],
        (err) => {
            if (err) console.error(err);
            res.redirect('/sistema?success=Nome do sistema atualizado com sucesso!');
        }
    );
});

// Download do Banco de Dados
router.get('/backup', verificarAutenticacaoConfig, (req, res) => {
    res.download(dbFilePath, 'backup_sistema.db', (err) => {
        if (err) {
            console.error("Erro ao baixar backup:", err);
            res.status(500).send("Erro ao baixar arquivo do banco.");
        }
    });
});

// Limpar Ordens de Serviço
router.post('/limpar-os', verificarAutenticacaoConfig, (req, res) => {
    db.run("DELETE FROM ordens", (err) => {
        if (err) {
            console.error("Erro ao deletar OS:", err);
            return res.status(500).send("Erro ao deletar ordens.");
        }
        db.run("VACUUM", (err) => {
            if (err) console.error("Erro no VACUUM apos limpar OS:", err);
            res.redirect('/sistema');
        });
    });
});

// Limpar TODOS os Clientes
router.post('/limpar-clientes', verificarAutenticacaoConfig, (req, res) => {
    db.run("DELETE FROM clientes", (err) => {
        if (err) {
            console.error("Erro ao deletar Clientes:", err);
            return res.status(500).send("Erro ao deletar clientes.");
        }
        db.run("VACUUM", (err) => {
            if (err) console.error("Erro no VACUUM apos limpar clientes:", err);
            res.redirect('/sistema');
        });
    });
});

// Restaurar Banco de Dados (Upload)
const uploadDb = multer({ dest: uploadsPath });

router.post('/restaurar', verificarAutenticacaoConfig, uploadDb.single('banco'), (req, res) => {
    if (!req.file) {
        return res.status(400).send("Nenhum arquivo enviado ou erro no upload.");
    }

    const tempPath = req.file.path;
    const targetPath = dbFilePath;

    db.close((err) => {
        if (err) {
            console.error("Erro ao fechar banco de dados para restauração:", err);
        }

        fs.copyFile(tempPath, targetPath, (copyErr) => {
            fs.unlink(tempPath, () => { });

            if (copyErr) {
                console.error("Erro ao sobrescrever o arquivo de banco de dados:", copyErr);
                return res.status(500).send("Falha ao restaurar o banco de dados. " + copyErr.message);
            }

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

            setTimeout(() => {
                process.exit(0);
            }, 2000);
        });
    });
});

module.exports = router;
