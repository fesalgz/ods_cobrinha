const db = require('../database/db');

exports.listar = (req, res) => {
    const statusFilter = req.query.status || '';
    const search = req.query.busca || '';

    let query = `
        SELECT o.*, c.nome as cliente_nome 
        FROM ordens o 
        JOIN clientes c ON o.cliente_id = c.id 
        WHERE 1=1
    `;
    const params = [];

    if (statusFilter) {
        query += ` AND o.status = ?`;
        params.push(statusFilter);
    }
    if (search) {
        query += ` AND (c.nome LIKE ? OR o.numero_os LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY o.id DESC`;

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Erro ao listar OS");
        }
        res.render('os/index', {
            title: 'Ordens de Serviço',
            ordens: rows,
            statusFilter,
            busca: search
        });
    });
};

exports.formulario = (req, res) => {
    db.all(`SELECT id, nome FROM clientes ORDER BY nome ASC`, [], (err, clientes) => {
        if (err) return res.status(500).send("Erro ao buscar clientes");

        const isAdmin = req.session.user && req.session.user.role === 'admin';
        const funcQuery = isAdmin
            ? `SELECT nome_os FROM usuarios ORDER BY nome_os ASC`
            : `SELECT nome_os FROM usuarios WHERE role != 'admin' ORDER BY nome_os ASC`;

        db.all(funcQuery, [], (err, funcionarios) => {
            if (err) return res.status(500).send("Erro ao buscar funcionários");

            const numero_os = Math.floor(100000 + Math.random() * 900000).toString();
            const clienteSelecionado = req.query.cliente || null;

            res.render('os/form', {
                title: 'Nova Ordem de Serviço',
                os: null,
                clientes,
                funcionarios,
                numero_os_sugerido: numero_os,
                clienteSelecionado
            });
        });
    });
};

exports.salvar = (req, res) => {
    const {
        numero_os, cliente_id, data_abertura, data_entrega, status,
        selecao_aparelho, aparelho_outro, aparelho_marca, aparelho_modelo, aparelho_cor,
        aparelho_ns, aparelho_imei, descricao_problema, observacoes_aparelho,
        valor, funcionario_nome
    } = req.body;

    const aparelhoFinal = (selecao_aparelho === 'Outro') ? aparelho_outro : selecao_aparelho;

    db.run(
        `INSERT INTO ordens (
            numero_os, cliente_id, data_abertura, data_entrega, status, 
            selecao_aparelho, aparelho_marca, aparelho_modelo, aparelho_cor, 
            aparelho_ns, aparelho_imei, descricao_problema, observacoes_aparelho, 
            valor, funcionario_nome
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            numero_os, cliente_id, data_abertura || new Date().toISOString().split('T')[0], data_entrega || null, status,
            aparelhoFinal, aparelho_marca, aparelho_modelo, aparelho_cor,
            aparelho_ns, aparelho_imei, descricao_problema, observacoes_aparelho,
            valor || 0, funcionario_nome
        ],
        function (err) {
            if (err) {
                console.error(err);
                return res.status(500).send("Erro ao salvar OS");
            }
            res.redirect('/os');
        }
    );
};

exports.editar = (req, res) => {
    const id = req.params.id;
    db.get(`SELECT * FROM ordens WHERE id = ?`, [id], (err, os) => {
        if (err || !os) return res.status(404).send("OS não encontrada");

        db.all(`SELECT id, nome FROM clientes ORDER BY nome ASC`, [], (err, clientes) => {
            if (err) return res.status(500).send("Erro ao buscar clientes");

            const isAdmin = req.session.user && req.session.user.role === 'admin';
            const funcQuery = isAdmin
                ? `SELECT nome_os FROM usuarios ORDER BY nome_os ASC`
                : `SELECT nome_os FROM usuarios WHERE role != 'admin' ORDER BY nome_os ASC`;

            db.all(funcQuery, [], (err, funcionarios) => {
                if (err) return res.status(500).send("Erro ao buscar funcionários");

                res.render('os/form', {
                    title: 'Editar Ordem de Serviço',
                    os,
                    clientes,
                    funcionarios,
                    numero_os_sugerido: os.numero_os,
                    clienteSelecionado: null
                });
            });
        });
    });
};

exports.atualizar = (req, res) => {
    const id = req.params.id;
    const {
        numero_os, cliente_id, data_abertura, data_entrega, status,
        selecao_aparelho, aparelho_outro, aparelho_marca, aparelho_modelo, aparelho_cor,
        aparelho_ns, aparelho_imei, descricao_problema, observacoes_aparelho,
        valor, funcionario_nome
    } = req.body;

    const aparelhoFinal = (selecao_aparelho === 'Outro') ? aparelho_outro : selecao_aparelho;

    db.run(
        `UPDATE ordens SET 
            numero_os = ?, cliente_id = ?, data_abertura = ?, data_entrega = ?, status = ?, 
            selecao_aparelho = ?, aparelho_marca = ?, aparelho_modelo = ?, aparelho_cor = ?, 
            aparelho_ns = ?, aparelho_imei = ?, descricao_problema = ?, observacoes_aparelho = ?, 
            valor = ?, funcionario_nome = ?
        WHERE id = ?`,
        [
            numero_os, cliente_id, data_abertura, data_entrega || null, status,
            aparelhoFinal, aparelho_marca, aparelho_modelo, aparelho_cor,
            aparelho_ns, aparelho_imei, descricao_problema, observacoes_aparelho,
            valor || 0, funcionario_nome, id
        ],
        function (err) {
            if (err) {
                console.error(err);
                return res.status(500).send("Erro ao atualizar OS");
            }
            res.redirect('/os');
        }
    );
};

exports.excluir = (req, res) => {
    const id = req.params.id;
    db.run(`DELETE FROM ordens WHERE id = ?`, [id], function (err) {
        if (err) {
            console.error(err);
            return res.status(500).send("Erro ao excluir OS");
        }
        res.redirect('/os');
    });
};

exports.imprimir = (req, res) => {
    const id = req.params.id;
    db.get(`
        SELECT ordens.*, clientes.nome as cliente_nome, clientes.telefone as cliente_telefone, clientes.cpf as cliente_cpf 
        FROM ordens 
        LEFT JOIN clientes ON ordens.cliente_id = clientes.id 
        WHERE ordens.id = ?`,
        [id], (err, os) => {
            if (err || !os) return res.status(404).send("OS não encontrada");

            // Buscar configurações do sistema para o cabeçalho
            db.get(`SELECT * FROM configuracoes WHERE id = 1`, [], (err, config) => {
                if (err) config = {};

                res.render('os/print', {
                    title: 'Imprimir OS',
                    os,
                    config: config || {}
                });
            });
        });
};
