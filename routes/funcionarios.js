const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { ensureAdmin } = require('../middlewares/authMiddleware');

// Somente admins e gerentes podem acessar funcionários (verificado no server.js)

// Listar funcionários
router.get('/', (req, res) => {
    // Se for admin, vê todo mundo. Se não for (gerente), vê apenas não-admins
    const isAdmin = req.session.user && req.session.user.role === 'admin';
    const query = isAdmin
        ? "SELECT * FROM usuarios"
        : "SELECT * FROM usuarios WHERE role != 'admin'";

    db.all(query, [], (err, rows) => {
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
    const { nome, nome_os, username, password, role } = req.body;
    db.run(
        'INSERT INTO usuarios (nome, nome_os, username, password, role) VALUES (?, ?, ?, ?, ?)',
        [nome, nome_os, username, password, role],
        (err) => {
            if (err) {
                return res.status(500).send('Erro ao criar funcionário. Username já existe?');
            }
            res.redirect('/funcionarios');
        }
    );
});

// Deletar funcionário
router.post('/delete/:id', (req, res) => {
    const id = req.params.id;
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
        // Proteção extra: Apenas admins podem editar contas de administrador
        if (func.role === 'admin' && req.session.user.role !== 'admin') {
            return res.status(403).send('Não é permitido editar contas de administrador.');
        }
        res.render('funcionarios/edit', {
            title: 'Editar Funcionário',
            func: func
        });
    });
});

// Atualizar funcionário (usando UPDATE sem trocar senha vazias)
router.post('/editar/:id', (req, res) => {
    const id = req.params.id;
    const { nome, nome_os, username, password, role } = req.body;

    // Adiciona condicional na query para impedir que não-admins editem admins
    const roleCondition = req.session.user.role === 'admin' ? "" : `AND role != 'admin'`;

    if (password && password.trim() !== '') {
        db.run(
            `UPDATE usuarios SET nome = ?, nome_os = ?, username = ?, password = ?, role = ? WHERE id = ? ${roleCondition}`,
            [nome, nome_os, username, password, role, id],
            (err) => {
                if (err) return res.status(500).send('Erro ao atualizar funcionário.');
                res.redirect('/funcionarios');
            }
        );
    } else {
        // Se a senha for vazia, mantem a atual
        db.run(
            `UPDATE usuarios SET nome = ?, nome_os = ?, username = ?, role = ? WHERE id = ? ${roleCondition}`,
            [nome, nome_os, username, role, id],
            (err) => {
                if (err) return res.status(500).send('Erro ao atualizar funcionário.');
                res.redirect('/funcionarios');
            }
        );
    }
});

module.exports = router;
