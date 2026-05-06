const db = require('../database/db');

exports.index = (req, res) => {
    const promises = [
        new Promise((resolve, reject) => {
            db.get("SELECT COUNT(*) as count FROM ordens WHERE status = 'Aberto' OR status = 'Em andamento'", (err, row) => {
                if (err) reject(err);
                resolve(row.count);
            });
        }),
        new Promise((resolve, reject) => {
            db.get("SELECT COUNT(*) as count FROM ordens WHERE status = 'Finalizado'", (err, row) => {
                if (err) reject(err);
                resolve(row.count);
            });
        }),
        new Promise((resolve, reject) => {
            db.get("SELECT SUM(valor) as total FROM ordens WHERE status = 'Finalizado'", (err, row) => {
                if (err) reject(err);
                resolve(row.total || 0);
            });
        }),
        new Promise((resolve, reject) => {
            db.all(`
                SELECT o.*, c.nome as cliente_nome 
                FROM ordens o 
                JOIN clientes c ON o.cliente_id = c.id 
                ORDER BY o.id DESC LIMIT 5
            `, (err, rows) => {
                if (err) reject(err);
                resolve(rows);
            });
        })
    ];

    Promise.all(promises)
        .then(results => {
            const [osAbertas, osFinalizadas, valorFaturado, ultimasOrdens] = results;
            res.render('dashboard', {
                title: 'Dashboard',
                osAbertas,
                osFinalizadas,
                valorFaturado,
                ultimasOrdens
            });
        })
        .catch(err => {
            console.error(err);
            res.status(500).send("Erro ao carregar o dashboard");
        });
};
