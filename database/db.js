const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'sistema.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');
        db.serialize(() => {
            // Criar tabela Clientes
            db.run(`
                CREATE TABLE IF NOT EXISTS clientes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nome TEXT NOT NULL,
                    telefone TEXT,
                    cpf TEXT,
                    observacoes TEXT
                )
            `);

            // Criar tabela Usuarios
            db.run(`
                CREATE TABLE IF NOT EXISTS usuarios (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    role TEXT NOT NULL DEFAULT 'atendente',
                    nome TEXT NOT NULL,
                    nome_os TEXT NOT NULL
                )
            `, (err) => {
                if (!err) {
                    // Inserir admin padrao se não exister
                    db.run(`INSERT OR IGNORE INTO usuarios (username, password, role, nome, nome_os) VALUES ('admin', 'admin', 'admin', 'Administrador Principal', 'Admin')`);
                }
            });

            // Criar tabela Ordens (removido servico_realizado e adc funcionario_nome)
            db.run(`
                CREATE TABLE IF NOT EXISTS ordens (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    numero_os TEXT UNIQUE,
                    cliente_id INTEGER,
                    data_abertura TEXT,
                    data_entrega TEXT,
                    status TEXT,
                    selecao_aparelho TEXT,
                    aparelho_marca TEXT,
                    aparelho_modelo TEXT,
                    aparelho_cor TEXT,
                    aparelho_ns TEXT,
                    aparelho_imei TEXT,
                    descricao_problema TEXT,
                    observacoes_aparelho TEXT,
                    valor REAL,
                    funcionario_nome TEXT,
                    FOREIGN KEY (cliente_id) REFERENCES clientes(id)
                )
            `);

            // Adicionar campo funcionario_nome e data_entrega em BDs antigos caso já existam via ALTER TABLE
            db.run("ALTER TABLE ordens ADD COLUMN funcionario_nome TEXT", (err) => { });
            db.run("ALTER TABLE ordens ADD COLUMN data_entrega TEXT", (err) => { });
            db.run("ALTER TABLE usuarios ADD COLUMN nome_os TEXT", (err) => { });

            // Criar Tabela de Configurações
            db.run(`
                CREATE TABLE IF NOT EXISTS configuracoes (
                    id INTEGER PRIMARY KEY DEFAULT 1,
                    empresa_nome TEXT,
                    empresa_endereco TEXT,
                    empresa_telefone TEXT,
                    logo_path TEXT,
                    tema_escuro INTEGER DEFAULT 0
                )
            `, (err) => {
                if (!err) {
                    db.get("SELECT COUNT(*) as count FROM configuracoes", [], (err, row) => {
                        if (row && row.count === 0) {
                            db.run(`INSERT INTO configuracoes (id, empresa_nome, empresa_endereco, empresa_telefone, logo_path) VALUES (1, 'NOME DA EMPRESA LTDA', 'Rua Exemplo, 123 - Centro - Cidade/UF', 'Telefone: (00) 0000-0000', null)`);
                        }
                    });
                }
            });



            // Adicionar colunas novas em BDs antigos
            db.run("ALTER TABLE configuracoes ADD COLUMN tema_escuro INTEGER DEFAULT 0", (err) => { });
        });
    }
});

module.exports = db;
