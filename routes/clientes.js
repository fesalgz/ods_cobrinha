const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/clienteController');

router.get('/', clienteController.listar);
router.get('/novo', clienteController.formulario);
router.post('/salvar', clienteController.salvar);
router.get('/editar/:id', clienteController.editar);
router.post('/atualizar/:id', clienteController.atualizar);
router.post('/excluir/:id', clienteController.excluir);

module.exports = router;
