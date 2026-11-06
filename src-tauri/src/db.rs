use rusqlite::Connection;
use serde::Serialize;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

pub struct DatabaseState {
    pub conn: Mutex<Connection>,
    pub path: PathBuf,
}

#[derive(Serialize)]
pub struct DatabaseInfo {
    pub db_path: String,
    pub clientes_count: i64,
    pub ordens_count: i64,
    pub usuarios_count: i64,
    pub empresa_nome: Option<String>,
    pub nome_sistema: Option<String>,
}

/// Localiza o caminho do banco de dados SQLite existente da v2.2.0,
/// priorizando o diretório de dados em produção (%APPDATA%\ordens-de-servico-cobrinha\database\sistema.db).
pub fn resolve_db_path() -> PathBuf {
    if let Some(roaming) = dirs::data_dir() {
        // Caminho exato utilizado pelo Electron em produção
        let electron_prod = roaming.join("ordens-de-servico-cobrinha").join("database").join("sistema.db");
        if electron_prod.exists() {
            log::info!("Banco SQLite v2.2.0 localizado em produção: {:?}", electron_prod);
            return electron_prod;
        }

        // Caminho alternativo caso tenha sido renomeado para ods_cobrinha
        let ods_alt = roaming.join("ods_cobrinha").join("database").join("sistema.db");
        if ods_alt.exists() {
            log::info!("Banco SQLite v2.2.0 localizado em: {:?}", ods_alt);
            return ods_alt;
        }
    }

    // Caminho local do projeto (modo de desenvolvimento)
    let local_db = PathBuf::from("database").join("sistema.db");
    if local_db.exists() {
        log::info!("Banco SQLite localizado localmente no projeto: {:?}", local_db);
        return local_db;
    }

    // Caso nenhum banco exista ainda, define o caminho oficial do usuário
    if let Some(roaming) = dirs::data_dir() {
        let target_dir = roaming.join("ordens-de-servico-cobrinha").join("database");
        let _ = std::fs::create_dir_all(&target_dir);
        return target_dir.join("sistema.db");
    }

    PathBuf::from("sistema.db")
}

/// Conecta ao SQLite e garante que a estrutura de tabelas exista sem alterar ou sobrescrever dados existentes.
pub fn init_db(path: &Path) -> Result<Connection, rusqlite::Error> {
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    let conn = Connection::open(path)?;

    conn.execute_batch("
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;
    ")?;

    // Tabela de clientes
    conn.execute("
        CREATE TABLE IF NOT EXISTS clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            telefone TEXT,
            cpf TEXT,
            observacoes TEXT
        )
    ", [])?;

    // Tabela de usuarios
    conn.execute("
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'atendente',
            nome TEXT NOT NULL,
            nome_os TEXT NOT NULL
        )
    ", [])?;

    let user_count: i64 = conn.query_row("SELECT COUNT(*) FROM usuarios", [], |r| r.get(0)).unwrap_or(0);
    if user_count == 0 {
        let _ = conn.execute("
            INSERT OR IGNORE INTO usuarios (username, password, role, nome, nome_os)
            VALUES ('admin', 'admin', 'admin', 'Administrador Principal', 'Admin')
        ", []);
    }

    // Tabela de ordens de serviço
    conn.execute("
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
            servico_realizado TEXT,
            valor REAL,
            funcionario_nome TEXT,
            is_garantia INTEGER DEFAULT 0,
            motivo_finalizacao TEXT,
            justificativa_finalizacao TEXT,
            FOREIGN KEY (cliente_id) REFERENCES clientes(id)
        )
    ", [])?;

    // Migrações seguras (ignora erro caso a coluna já exista)
    let _ = conn.execute("ALTER TABLE ordens ADD COLUMN funcionario_nome TEXT", []);
    let _ = conn.execute("ALTER TABLE ordens ADD COLUMN data_entrega TEXT", []);
    let _ = conn.execute("ALTER TABLE ordens ADD COLUMN is_garantia INTEGER DEFAULT 0", []);
    let _ = conn.execute("ALTER TABLE ordens ADD COLUMN motivo_finalizacao TEXT", []);
    let _ = conn.execute("ALTER TABLE ordens ADD COLUMN justificativa_finalizacao TEXT", []);
    let _ = conn.execute("ALTER TABLE ordens ADD COLUMN servico_realizado TEXT", []);
    let _ = conn.execute("ALTER TABLE usuarios ADD COLUMN nome_os TEXT", []);

    // Tabela de configurações
    conn.execute("
        CREATE TABLE IF NOT EXISTS configuracoes (
            id INTEGER PRIMARY KEY DEFAULT 1,
            nome_sistema TEXT DEFAULT 'Cobrinha Games',
            empresa_nome TEXT,
            empresa_endereco TEXT,
            empresa_telefone TEXT,
            logo_path TEXT,
            tema_escuro INTEGER DEFAULT 0,
            senha_painel TEXT,
            normas_os TEXT
        )
    ", [])?;

    let config_count: i64 = conn.query_row("SELECT COUNT(*) FROM configuracoes", [], |r| r.get(0)).unwrap_or(0);
    if config_count == 0 {
        let _ = conn.execute("
            INSERT INTO configuracoes (id, nome_sistema, empresa_nome, empresa_endereco, empresa_telefone, tema_escuro, senha_painel)
            VALUES (1, 'Cobrinha Games', 'Cobrinha Games', 'Taubaté - SP', '(12) 98124-3951', 0, 'admin')
        ", []);
    }

    Ok(conn)
}

