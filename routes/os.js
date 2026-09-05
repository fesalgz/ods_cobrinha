const express = require('express');
const router = express.Router();
const osController = require('../controllers/osController');

router.get('/', osController.listar);
router.get('/nova', osController.formulario);
router.post('/salvar', osController.salvar);
router.get('/editar/:id', osController.editar);
router.post('/atualizar/:id', osController.atualizar);
router.post('/excluir/:id', osController.excluir);
router.get('/imprimir/entrada/:id', osController.imprimirEntrada);
router.get('/imprimir/saida/:id', osController.imprimirSaida);

module.exports = router;
