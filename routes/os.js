const express = require('express');
const router = express.Router();
const osController = require('../controllers/osController');

router.get('/', osController.listar);
router.get('/nova', osController.formulario);
router.post('/salvar', osController.salvar);
router.get('/editar/:id', osController.editar);
router.post('/atualizar/:id', osController.atualizar);
router.post('/excluir/:id', osController.excluir);
router.get('/imprimir/:id', osController.imprimir);

module.exports = router;
