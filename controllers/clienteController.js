const db = require('../database/db');

exports.listar = (req, res) => {
    const search = req.query.busca || '';
    const query = `SELECT * FROM clientes WHERE nome LIKE ? ORDER BY name DESC`;

    db.all(`SELECT * FROM clientes WHERE cpf LIKE ? ORDER BY nome ASC`, [`%${search}%`], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Erro ao listar clientes");
        }
        res.render('clientes/index', { title: 'Clientes', clientes: rows, busca: search });
    });
};

exports.formulario = (req, res) => {
    res.render('clientes/form', { title: 'Novo Cliente', cliente: null });
};

exports.salvar = (req, res) => {
    const { nome, telefone, cpf, observacoes } = req.body;
    db.run(
        `INSERT INTO clientes (nome, telefone, cpf, observacoes) VALUES (?, ?, ?, ?)`,
        [nome, telefone, cpf, observacoes],
        function (err) {
            if (err) {
                console.error(err);
                return res.status(500).send("Erro ao salvar cliente");
            }
            res.redirect('/clientes');
        }
    );
};

exports.editar = (req, res) => {
    const id = req.params.id;
    db.get(`SELECT * FROM clientes WHERE id = ?`, [id], (err, row) => {
        if (err || !row) {
            return res.status(404).send("Cliente não encontrado");
        }
        res.render('clientes/form', { title: 'Editar Cliente', cliente: row });
    });
};

exports.atualizar = (req, res) => {
    const id = req.params.id;
    const { nome, telefone, cpf, observacoes } = req.body;
    db.run(
        `UPDATE clientes SET nome = ?, telefone = ?, cpf = ?, observacoes = ? WHERE id = ?`,
        [nome, telefone, cpf, observacoes, id],
        function (err) {
            if (err) {
                console.error(err);
                return res.status(500).send("Erro ao atualizar cliente");
            }
            res.redirect('/clientes');
        }
    );
};

exports.excluir = (req, res) => {
    const id = req.params.id;
    // Verifica se o cliente tem OS antes de excluir
    db.get(`SELECT COUNT(*) as count FROM ordens WHERE cliente_id = ?`, [id], (err, row) => {
        if (err) return res.status(500).send("Erro ao verificar dependências");

        if (row.count > 0) {
            return res.status(400).send("Não é possível excluir cliente com ordens de serviço vinculadas.");
        }

        db.run(`DELETE FROM clientes WHERE id = ?`, [id], function (err) {
            if (err) {
                console.error(err);
                return res.status(500).send("Erro ao excluir cliente");
            }
            res.redirect('/clientes');
        });
    });
};
