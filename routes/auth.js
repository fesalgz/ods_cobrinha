const express = require('express');
const router = express.Router();
const db = require('../database/db');

router.get('/login', (req, res) => {
    // Se ja estiver logado, vai pro dashboard
    if (req.session && req.session.user) {
        return res.redirect('/');
    }
    res.render('login', { error: null });
});

router.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM usuarios WHERE username = ? AND password = ?', [username, password], (err, user) => {
        if (err || !user) {
            return res.render('login', { error: 'Usuário ou senha incorretos' });
        }
        req.session.user = {
            id: user.id,
            username: user.username,
            role: user.role,
            nome: user.nome
        };
        res.redirect('/');
    });
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

module.exports = router;
