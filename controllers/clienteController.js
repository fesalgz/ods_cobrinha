const db = require('../database/db');

function validarCPF(cpf) {
    cpf = cpf.replace(/\D/g, '');
    if (cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false;
    let soma = 0;
    for (let i = 0; i < 9; i++) soma += parseInt(cpf.charAt(i)) * (10 - i);
    let resto = (soma * 10) % 11;
    if (resto === 10) resto = 0;
    if (resto !== parseInt(cpf.charAt(9))) return false;
    soma = 0;
    for (let i = 0; i < 10; i++) soma += parseInt(cpf.charAt(i)) * (11 - i);
    resto = (soma * 10) % 11;
    if (resto === 10) resto = 0;
    if (resto !== parseInt(cpf.charAt(10))) return false;
    return true;
}

// Validação centralizada de cliente (CPF + telefone)
function validarCliente(cpf, telefone) {
    const cleanCpf = cpf ? cpf.replace(/\D/g, '') : '';
    if (!cleanCpf || cleanCpf.length !== 11) return 'O CPF deve conter exatamente 11 números.';
    if (!validarCPF(cleanCpf)) return 'CPF inválido. Verifique os números digitados.';
    const cleanTel = telefone ? telefone.replace(/\D/g, '') : '';
    if (!cleanTel || cleanTel.length !== 11) return 'O telefone deve conter exatamente 11 números (DDD + número).';
    return null;
}

exports.listar = (req, res) => {
    const search = req.query.busca || '';
    db.all(`SELECT * FROM clientes WHERE cpf LIKE ? ORDER BY nome ASC`, [`%${search}%`], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Erro ao listar clientes");
        }
        res.render('clientes/index', { title: 'Clientes', clientes: rows, busca: search });
    });
};

exports.formulario = (req, res) => {
    res.render('clientes/form', { title: 'Novo Cliente', cliente: null, error: null });
};

exports.salvar = (req, res) => {
    const { nome, telefone, cpf, observacoes } = req.body;

    const erroValidacao = validarCliente(cpf, telefone);
    if (erroValidacao) {
        return res.render('clientes/form', {
            title: 'Novo Cliente',
            cliente: { nome, telefone, cpf, observacoes },
            error: erroValidacao
        });
    }

    const cleanCpf = cpf.replace(/\D/g, '');
    db.get(
        `SELECT * FROM clientes WHERE REPLACE(REPLACE(cpf, '.', ''), '-', '') = ?`,
        [cleanCpf],
        (err, row) => {
            if (err) {
                console.error(err);
                return res.status(500).send("Erro ao verificar CPF");
            }
            if (row) {
                return res.render('clientes/form', {
                    title: 'Novo Cliente',
                    cliente: { nome, telefone, cpf, observacoes },
                    error: 'Este CPF já está cadastrado para outro cliente.'
                });
            }

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
        }
    );
};

exports.editar = (req, res) => {
    const id = req.params.id;
    db.get(`SELECT * FROM clientes WHERE id = ?`, [id], (err, row) => {
        if (err || !row) {
            return res.status(404).send("Cliente não encontrado");
        }
        res.render('clientes/form', { title: 'Editar Cliente', cliente: row, error: null });
    });
};

exports.atualizar = (req, res) => {
    const id = req.params.id;
    const { nome, telefone, cpf, observacoes } = req.body;

    const erroValidacao = validarCliente(cpf, telefone);
    if (erroValidacao) {
        return res.render('clientes/form', {
            title: 'Editar Cliente',
            cliente: { id, nome, telefone, cpf, observacoes },
            error: erroValidacao
        });
    }

    const cleanCpf = cpf.replace(/\D/g, '');
    db.get(
        `SELECT * FROM clientes WHERE REPLACE(REPLACE(cpf, '.', ''), '-', '') = ? AND id != ?`,
        [cleanCpf, id],
        (err, row) => {
            if (err) {
                console.error(err);
                return res.status(500).send("Erro ao verificar CPF");
            }
            if (row) {
                return res.render('clientes/form', {
                    title: 'Editar Cliente',
                    cliente: { id, nome, telefone, cpf, observacoes },
                    error: 'Este CPF já está cadastrado para outro cliente.'
                });
            }

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
