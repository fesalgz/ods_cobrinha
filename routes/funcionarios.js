const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Somente admins e gerentes podem acessar funcionários (verificado no server.js)

// Listar funcionários
router.get('/', (req, res) => {
    // Como agora não tem mais restrição de login, todos podem ver todos, mas mantendo a query:
    db.all("SELECT * FROM usuarios", [], (err, rows) => {
        if (err) {
            return res.status(500).send('Erro ao buscar funcionários');
        }
        res.render('funcionarios/index', {
            title: 'Funcionários',
            funcionarios: rows
        });
    });
});

// Criar funcionário
router.post('/add', (req, res) => {
    const { nome, nome_os, role } = req.body;
    // Gerar um username mockado único pois a tabela exige UNIQUE e NOT NULL
    const dummyUsername = 'func_' + Date.now();
    const dummyPassword = '123';

    db.run(
        'INSERT INTO usuarios (nome, nome_os, username, password, role) VALUES (?, ?, ?, ?, ?)',
        [nome, nome_os, dummyUsername, dummyPassword, role],
        (err) => {
            if (err) {
                return res.status(500).send('Erro ao criar funcionário.');
            }
            res.redirect('/funcionarios');
        }
    );
});

// Deletar funcionário
router.post('/delete/:id', (req, res) => {
    const id = req.params.id;
    // O id 1 costuma ser o Admin, mas como estamos mockando id 1 na sessão:
    if (id == req.session.user.id) {
        return res.status(400).send('Você não pode deletar a si mesmo.');
    }
    db.run('DELETE FROM usuarios WHERE id = ?', [id], (err) => {
        if (err) {
            return res.status(500).send('Erro ao deletar funcionário');
        }
        res.redirect('/funcionarios');
    });
});

// Tela de Edição de funcionário
router.get('/editar/:id', (req, res) => {
    const id = req.params.id;
    db.get('SELECT * FROM usuarios WHERE id = ?', [id], (err, func) => {
        if (err || !func) {
            return res.status(404).send('Funcionário não encontrado.');
        }
        res.render('funcionarios/edit', {
            title: 'Editar Funcionário',
            func: func
        });
    });
});

// Atualizar funcionário
router.post('/editar/:id', (req, res) => {
    const id = req.params.id;
    const { nome, nome_os, role } = req.body;

    db.run(
        `UPDATE usuarios SET nome = ?, nome_os = ?, role = ? WHERE id = ?`,
        [nome, nome_os, role, id],
        (err) => {
            if (err) return res.status(500).send('Erro ao atualizar funcionário.');
            res.redirect('/funcionarios');
        }
    );
});

module.exports = router;
