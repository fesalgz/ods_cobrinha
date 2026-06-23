const express = require('express');
const router = express.Router();
const { exec } = require('child_process');

router.get('/', (req, res) => {
    res.render('etiquetas/index', {
        title: 'Etiquetas'
    });
});

router.post('/abrir-no-navegador', (req, res) => {
    // Abre a URL do sistema no navegador padrão do Windows (start)
    const command = 'start http://localhost:3000/etiquetas';
    exec(command, (err) => {
        if (err) {
            console.error('Erro ao abrir navegador:', err);
            return res.status(500).json({ success: false, error: err.message });
        }
        res.json({ success: true });
    });
});

module.exports = router;
