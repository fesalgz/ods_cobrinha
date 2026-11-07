use crate::db::DatabaseState;
use crate::models::*;
use rusqlite::params;
use std::time::{SystemTime, UNIX_EPOCH};

fn current_date_str() -> String {
    // Retorna data no formato YYYY-MM-DD
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    // Conversão simples e robusta para data UTC
    let days = now / 86400;
    let mut year = 1970;
    let mut remaining_days = days as i64;

    loop {
        let is_leap = (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
        let days_in_year = if is_leap { 366 } else { 365 };
        if remaining_days < days_in_year {
            break;
        }
        remaining_days -= days_in_year;
        year += 1;
    }

    let is_leap = (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
    let days_in_months = [
        31,
        if is_leap { 29 } else { 28 },
        31, 30, 31, 30, 31, 31, 30, 31, 30, 31,
    ];

    let mut month = 1;
    for &dim in days_in_months.iter() {
        if remaining_days < dim {
            break;
        }
        remaining_days -= dim;
        month += 1;
    }
    let day = remaining_days + 1;

    format!("{:04}-{:02}-{:02}", year, month, day)
}

fn validar_cpf(cpf: &str) -> bool {
    let clean: Vec<u32> = cpf.chars().filter_map(|c| c.to_digit(10)).collect();
    if clean.len() != 11 {
        return false;
    }
    let first = clean[0];
    if clean.iter().all(|&x| x == first) {
        return false;
    }

    // Primeiro dígito verificador
    let mut soma: u32 = 0;
    for i in 0..9 {
        soma += clean[i] * (10 - i as u32);
    }
    let mut resto = (soma * 10) % 11;
    if resto == 10 {
        resto = 0;
    }
    if resto != clean[9] {
        return false;
    }

    // Segundo dígito verificador
    soma = 0;
    for i in 0..10 {
        soma += clean[i] * (11 - i as u32);
    }
    resto = (soma * 10) % 11;
    if resto == 10 {
        resto = 0;
    }
    if resto != clean[10] {
        return false;
    }

    true
}

fn validar_cliente(cpf: Option<&str>, telefone: Option<&str>) -> Result<(), String> {
    if let Some(c) = cpf {
        let clean: String = c.chars().filter(|ch| ch.is_ascii_digit()).collect();
        if clean.is_empty() || clean.len() != 11 {
            return Err("O CPF deve conter exatamente 11 números.".into());
        }
        if !validar_cpf(&clean) {
            return Err("CPF inválido. Verifique os números digitados.".into());
        }
    } else {
        return Err("O CPF é obrigatório.".into());
    }

    if let Some(t) = telefone {
        let clean: String = t.chars().filter(|ch| ch.is_ascii_digit()).collect();
        if clean.is_empty() || clean.len() != 11 {
            return Err("O telefone deve conter exatamente 11 números (DDD + número).".into());
        }
    } else {
        return Err("O telefone é obrigatório.".into());
    }

    Ok(())
}

// ----------------------------------------------------
// DASHBOARD COMMANDS
// ----------------------------------------------------

#[tauri::command]
pub fn get_dashboard_data(state: tauri::State<DatabaseState>) -> Result<DashboardData, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let os_abertas: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM ordens WHERE status = 'Aberto' OR status = 'Em andamento'",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0);

    let os_finalizadas: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM ordens WHERE status = 'Finalizado'",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0);

    let valor_faturado: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(valor), 0.0) FROM ordens WHERE status = 'Finalizado'",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0.0);

    let mut stmt = conn
        .prepare(
            "SELECT o.id, o.numero_os, o.cliente_id, c.nome, c.telefone, c.cpf,
                    o.data_abertura, o.data_entrega, o.status, o.selecao_aparelho,
                    o.aparelho_marca, o.aparelho_modelo, o.aparelho_cor, o.aparelho_ns,
                    o.aparelho_imei, o.descricao_problema, o.observacoes_aparelho,
                    o.servico_realizado, o.valor, o.funcionario_nome, o.is_garantia,
                    o.motivo_finalizacao, o.justificativa_finalizacao
             FROM ordens o
             JOIN clientes c ON o.cliente_id = c.id
             ORDER BY o.id DESC LIMIT 5",
        )
        .map_err(|e| e.to_string())?;

    let ultimas_ordens = stmt
        .query_map([], |r| {
            Ok(Ordem {
                id: r.get(0)?,
                numero_os: r.get(1)?,
                cliente_id: r.get(2)?,
                cliente_nome: r.get(3)?,
                cliente_telefone: r.get(4)?,
                cliente_cpf: r.get(5)?,
                data_abertura: r.get(6)?,
                data_entrega: r.get(7)?,
                status: r.get(8)?,
                selecao_aparelho: r.get(9)?,
                aparelho_marca: r.get(10)?,
                aparelho_modelo: r.get(11)?,
                aparelho_cor: r.get(12)?,
                aparelho_ns: r.get(13)?,
                aparelho_imei: r.get(14)?,
                descricao_problema: r.get(15)?,
                observacoes_aparelho: r.get(16)?,
                servico_realizado: r.get(17)?,
                valor: r.get(18)?,
                funcionario_nome: r.get(19)?,
                is_garantia: r.get(20)?,
                motivo_finalizacao: r.get(21)?,
                justificativa_finalizacao: r.get(22)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(DashboardData {
        os_abertas,
        os_finalizadas,
        valor_faturado,
        ultimas_ordens,
    })
}

// ----------------------------------------------------
// CLIENTES COMMANDS
// ----------------------------------------------------

#[tauri::command]
pub fn listar_clientes(
    busca: Option<String>,
    state: tauri::State<DatabaseState>,
) -> Result<Vec<Cliente>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let search_term = busca.unwrap_or_default();

    let query = if search_term.is_empty() {
        "SELECT id, nome, telefone, cpf, observacoes FROM clientes ORDER BY nome ASC".to_string()
    } else {
        "SELECT id, nome, telefone, cpf, observacoes FROM clientes WHERE nome LIKE ?1 OR cpf LIKE ?1 ORDER BY nome ASC".to_string()
    };

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;

    let rows = if search_term.is_empty() {
        stmt.query_map([], |r| {
            Ok(Cliente {
                id: r.get(0)?,
                nome: r.get(1)?,
                telefone: r.get(2)?,
                cpf: r.get(3)?,
                observacoes: r.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect()
    } else {
        let pattern = format!("%{}%", search_term);
        stmt.query_map([&pattern], |r| {
            Ok(Cliente {
                id: r.get(0)?,
                nome: r.get(1)?,
                telefone: r.get(2)?,
                cpf: r.get(3)?,
                observacoes: r.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect()
    };

    Ok(rows)
}

#[tauri::command]
pub fn get_cliente(id: i64, state: tauri::State<DatabaseState>) -> Result<Cliente, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.query_row(
        "SELECT id, nome, telefone, cpf, observacoes FROM clientes WHERE id = ?",
        [id],
        |r| {
            Ok(Cliente {
                id: r.get(0)?,
                nome: r.get(1)?,
                telefone: r.get(2)?,
                cpf: r.get(3)?,
                observacoes: r.get(4)?,
            })
        },
    )
    .map_err(|_| "Cliente não encontrado.".into())
}

#[tauri::command]
pub fn salvar_cliente(cliente: ClienteInput, state: tauri::State<DatabaseState>) -> Result<i64, String> {
    validar_cliente(cliente.cpf.as_deref(), cliente.telefone.as_deref())?;

    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let raw_cpf = cliente.cpf.unwrap_or_default();
    let clean_cpf: String = raw_cpf.chars().filter(|c| c.is_ascii_digit()).collect();

    // Checar duplicidade de CPF
    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM clientes WHERE REPLACE(REPLACE(cpf, '.', ''), '-', '') = ?",
            [&clean_cpf],
            |r| r.get(0),
        )
        .unwrap_or(0);

    if count > 0 {
        return Err("Este CPF já está cadastrado para outro cliente.".into());
    }

    conn.execute(
        "INSERT INTO clientes (nome, telefone, cpf, observacoes) VALUES (?, ?, ?, ?)",
        params![cliente.nome, cliente.telefone, raw_cpf, cliente.observacoes],
    )
    .map_err(|e| e.to_string())?;

    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub fn atualizar_cliente(
    id: i64,
    cliente: ClienteInput,
    state: tauri::State<DatabaseState>,
) -> Result<(), String> {
    validar_cliente(cliente.cpf.as_deref(), cliente.telefone.as_deref())?;

    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let raw_cpf = cliente.cpf.unwrap_or_default();
    let clean_cpf: String = raw_cpf.chars().filter(|c| c.is_ascii_digit()).collect();

    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM clientes WHERE REPLACE(REPLACE(cpf, '.', ''), '-', '') = ? AND id != ?",
            params![&clean_cpf, id],
            |r| r.get(0),
        )
        .unwrap_or(0);

    if count > 0 {
        return Err("Este CPF já está cadastrado para outro cliente.".into());
    }

    conn.execute(
        "UPDATE clientes SET nome = ?, telefone = ?, cpf = ?, observacoes = ? WHERE id = ?",
        params![cliente.nome, cliente.telefone, raw_cpf, cliente.observacoes, id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn excluir_cliente(id: i64, state: tauri::State<DatabaseState>) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let ordens_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM ordens WHERE cliente_id = ?",
            [id],
            |r| r.get(0),
        )
        .unwrap_or(0);

    if ordens_count > 0 {
        return Err("Não é possível excluir cliente com ordens de serviço vinculadas.".into());
    }

    conn.execute("DELETE FROM clientes WHERE id = ?", [id])
        .map_err(|e| e.to_string())?;

    Ok(())
}

// ----------------------------------------------------
// ORDENS DE SERVIÇO COMMANDS
// ----------------------------------------------------

#[tauri::command]
pub fn listar_ordens(
    status_filter: Option<String>,
    busca: Option<String>,
    state: tauri::State<DatabaseState>,
) -> Result<Vec<Ordem>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let mut query = "
        SELECT o.id, o.numero_os, o.cliente_id, c.nome, c.telefone, c.cpf,
               o.data_abertura, o.data_entrega, o.status, o.selecao_aparelho,
               o.aparelho_marca, o.aparelho_modelo, o.aparelho_cor, o.aparelho_ns,
               o.aparelho_imei, o.descricao_problema, o.observacoes_aparelho,
               o.servico_realizado, o.valor, o.funcionario_nome, o.is_garantia,
               o.motivo_finalizacao, o.justificativa_finalizacao
        FROM ordens o
        JOIN clientes c ON o.cliente_id = c.id
        WHERE 1=1
    ".to_string();

    let mut conditions = Vec::new();
    let mut params_vec: Vec<String> = Vec::new();

    if let Some(s) = status_filter {
        if !s.is_empty() {
            conditions.push("o.status = ?");
            params_vec.push(s);
        }
    }

    if let Some(b) = busca {
        if !b.is_empty() {
            conditions.push("(c.nome LIKE ? OR o.numero_os LIKE ?)");
            let pattern = format!("%{}%", b);
            params_vec.push(pattern.clone());
            params_vec.push(pattern);
        }
    }

    for cond in conditions {
        query.push_str(" AND ");
        query.push_str(cond);
    }

    query.push_str(" ORDER BY o.id DESC");

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    let rusqlite_params = rusqlite::params_from_iter(params_vec.iter());

    let ordens = stmt
        .query_map(rusqlite_params, |r| {
            Ok(Ordem {
                id: r.get(0)?,
                numero_os: r.get(1)?,
                cliente_id: r.get(2)?,
                cliente_nome: r.get(3)?,
                cliente_telefone: r.get(4)?,
                cliente_cpf: r.get(5)?,
                data_abertura: r.get(6)?,
                data_entrega: r.get(7)?,
                status: r.get(8)?,
                selecao_aparelho: r.get(9)?,
                aparelho_marca: r.get(10)?,
                aparelho_modelo: r.get(11)?,
                aparelho_cor: r.get(12)?,
                aparelho_ns: r.get(13)?,
                aparelho_imei: r.get(14)?,
                descricao_problema: r.get(15)?,
                observacoes_aparelho: r.get(16)?,
                servico_realizado: r.get(17)?,
                valor: r.get(18)?,
                funcionario_nome: r.get(19)?,
                is_garantia: r.get(20)?,
                motivo_finalizacao: r.get(21)?,
                justificativa_finalizacao: r.get(22)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(ordens)
}

#[tauri::command]
pub fn get_ordem(id: i64, state: tauri::State<DatabaseState>) -> Result<Ordem, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    conn.query_row(
        "SELECT o.id, o.numero_os, o.cliente_id, c.nome, c.telefone, c.cpf,
                o.data_abertura, o.data_entrega, o.status, o.selecao_aparelho,
                o.aparelho_marca, o.aparelho_modelo, o.aparelho_cor, o.aparelho_ns,
                o.aparelho_imei, o.descricao_problema, o.observacoes_aparelho,
                o.servico_realizado, o.valor, o.funcionario_nome, o.is_garantia,
                o.motivo_finalizacao, o.justificativa_finalizacao
         FROM ordens o
         JOIN clientes c ON o.cliente_id = c.id
         WHERE o.id = ?",
        [id],
        |r| {
            Ok(Ordem {
                id: r.get(0)?,
                numero_os: r.get(1)?,
                cliente_id: r.get(2)?,
                cliente_nome: r.get(3)?,
                cliente_telefone: r.get(4)?,
                cliente_cpf: r.get(5)?,
                data_abertura: r.get(6)?,
                data_entrega: r.get(7)?,
                status: r.get(8)?,
                selecao_aparelho: r.get(9)?,
                aparelho_marca: r.get(10)?,
                aparelho_modelo: r.get(11)?,
                aparelho_cor: r.get(12)?,
                aparelho_ns: r.get(13)?,
                aparelho_imei: r.get(14)?,
                descricao_problema: r.get(15)?,
                observacoes_aparelho: r.get(16)?,
                servico_realizado: r.get(17)?,
                valor: r.get(18)?,
                funcionario_nome: r.get(19)?,
                is_garantia: r.get(20)?,
                motivo_finalizacao: r.get(21)?,
                justificativa_finalizacao: r.get(22)?,
            })
        },
    )
    .map_err(|_| "Ordem de Serviço não encontrada.".into())
}

#[tauri::command]
pub fn salvar_ordem(ordem: OrdemInput, state: tauri::State<DatabaseState>) -> Result<i64, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let numero_os = ordem.numero_os.unwrap_or_else(|| {
        let ts = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .subsec_nanos();
        format!("{:06}", (100000 + (ts % 900000)))
    });

    let data_abertura = ordem.data_abertura.unwrap_or_else(current_date_str);
    let selecao_aparelho = if ordem.selecao_aparelho.as_deref() == Some("Outro") {
        ordem.aparelho_outro
    } else {
        ordem.selecao_aparelho
    };

    let is_garantia_num: i64 = if ordem.is_garantia.unwrap_or(false) { 1 } else { 0 };

    conn.execute(
        "INSERT INTO ordens (
            numero_os, cliente_id, data_abertura, data_entrega, status,
            selecao_aparelho, aparelho_marca, aparelho_modelo, aparelho_cor,
            aparelho_ns, aparelho_imei, descricao_problema, observacoes_aparelho,
            valor, funcionario_nome, is_garantia
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        params![
            numero_os,
            ordem.cliente_id,
            data_abertura,
            ordem.data_entrega,
            ordem.status,
            selecao_aparelho,
            ordem.aparelho_marca,
            ordem.aparelho_modelo,
            ordem.aparelho_cor,
            ordem.aparelho_ns,
            ordem.aparelho_imei,
            ordem.descricao_problema,
            ordem.observacoes_aparelho,
            ordem.valor.unwrap_or(0.0),
            ordem.funcionario_nome,
            is_garantia_num
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub fn atualizar_ordem(
    id: i64,
    ordem: OrdemInput,
    state: tauri::State<DatabaseState>,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let current_status: String = conn
        .query_row("SELECT status FROM ordens WHERE id = ?", [id], |r| {
            r.get(0)
        })
        .map_err(|_| "OS não encontrada.")?;

    if current_status == "Finalizado" {
        return Err("Não é possível editar uma OS que já foi finalizada.".into());
    }

    let selecao_aparelho = if ordem.selecao_aparelho.as_deref() == Some("Outro") {
        ordem.aparelho_outro
    } else {
        ordem.selecao_aparelho
    };

    let is_garantia_num: i64 = if ordem.is_garantia.unwrap_or(false) { 1 } else { 0 };

    let mut data_entrega = ordem.data_entrega;
    if ordem.status == "Finalizado" && data_entrega.is_none() {
        data_entrega = Some(current_date_str());
    }

    conn.execute(
        "UPDATE ordens SET
            numero_os = ?, cliente_id = ?, data_abertura = ?, data_entrega = ?, status = ?,
            selecao_aparelho = ?, aparelho_marca = ?, aparelho_modelo = ?, aparelho_cor = ?,
            aparelho_ns = ?, aparelho_imei = ?, descricao_problema = ?, observacoes_aparelho = ?,
            valor = ?, funcionario_nome = ?, is_garantia = ?
        WHERE id = ?",
        params![
            ordem.numero_os,
            ordem.cliente_id,
            ordem.data_abertura,
            data_entrega,
            ordem.status,
            selecao_aparelho,
            ordem.aparelho_marca,
            ordem.aparelho_modelo,
            ordem.aparelho_cor,
            ordem.aparelho_ns,
            ordem.aparelho_imei,
            ordem.descricao_problema,
            ordem.observacoes_aparelho,
            ordem.valor.unwrap_or(0.0),
            ordem.funcionario_nome,
            is_garantia_num,
            id
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn finalizar_ordem(
    id: i64,
    payload: FinalizarOrdemInput,
    state: tauri::State<DatabaseState>,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let today = current_date_str();
    let is_garantia_num: i64 = if payload.is_garantia.unwrap_or(false) { 1 } else { 0 };

    conn.execute(
        "UPDATE ordens SET
            status = 'Finalizado',
            motivo_finalizacao = ?,
            justificativa_finalizacao = ?,
            descricao_problema = ?,
            observacoes_aparelho = ?,
            valor = ?,
            is_garantia = ?,
            data_entrega = ?
        WHERE id = ?",
        params![
            payload.motivo_finalizacao,
            payload.justificativa_finalizacao,
            payload.descricao_problema,
            payload.observacoes_aparelho,
            payload.valor.unwrap_or(0.0),
            is_garantia_num,
            today,
            id
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn excluir_ordem(id: i64, state: tauri::State<DatabaseState>) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM ordens WHERE id = ?", [id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

fn bytes_to_base64(bytes: &[u8]) -> String {
    const CHARSET: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut result = String::with_capacity((bytes.len() + 2) / 3 * 4);
    for chunk in bytes.chunks(3) {
        let b0 = chunk[0] as usize;
        let b1 = chunk.get(1).copied().unwrap_or(0) as usize;
        let b2 = chunk.get(2).copied().unwrap_or(0) as usize;
        let triple = (b0 << 16) | (b1 << 8) | b2;
        result.push(CHARSET[(triple >> 18) & 0x3F] as char);
        result.push(CHARSET[(triple >> 12) & 0x3F] as char);
        if chunk.len() > 1 {
            result.push(CHARSET[(triple >> 6) & 0x3F] as char);
        } else {
            result.push('=');
        }
        if chunk.len() > 2 {
            result.push(CHARSET[triple & 0x3F] as char);
        } else {
            result.push('=');
        }
    }
    result
}

fn resolver_logo_base64(logo_path: &Option<String>, db_path: &std::path::Path) -> Option<String> {
    let rel = logo_path.as_ref()?;
    if rel.trim().is_empty() {
        return None;
    }

    let p1 = std::path::PathBuf::from(rel);
    let mut candidatos = vec![p1];

    let clean = rel.trim_start_matches('/').trim_start_matches('\\');
    if let Some(app_dir) = db_path.parent().and_then(|p| p.parent()) {
        candidatos.push(app_dir.join(clean));
        candidatos.push(app_dir.join("uploads").join(clean.trim_start_matches("uploads/").trim_start_matches("uploads\\")));
    }
    if let Some(roaming) = dirs::data_dir() {
        let uploads_dir = roaming.join("ordens-de-servico-cobrinha").join("uploads");
        let filename = std::path::Path::new(clean).file_name().unwrap_or_default();
        candidatos.push(uploads_dir.join(filename));
    }

    for path in candidatos {
        if path.is_file() {
            if let Ok(bytes) = std::fs::read(&path) {
                let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("png").to_lowercase();
                let mime = match ext.as_str() {
                    "jpg" | "jpeg" => "image/jpeg",
                    "svg" => "image/svg+xml",
                    "webp" => "image/webp",
                    "gif" => "image/gif",
                    _ => "image/png",
                };
                let b64 = bytes_to_base64(&bytes);
                return Some(format!("data:{};base64,{}", mime, b64));
            }
        }
    }
    None
}

#[tauri::command]
pub fn get_dados_impressao(
    id: i64,
    tipo: String,
    state: tauri::State<DatabaseState>,
) -> Result<DadosImpressao, String> {
    let ordem = get_ordem(id, state.clone())?;
    let config = get_configuracoes(state.clone())?;
    let logo_base64 = resolver_logo_base64(&config.logo_path, &state.path);

    Ok(DadosImpressao {
        ordem,
        config,
        tipo,
        logo_base64,
    })
}

// ----------------------------------------------------
// FUNCIONÁRIOS / USUÁRIOS COMMANDS
// ----------------------------------------------------

#[tauri::command]
pub fn listar_funcionarios(state: tauri::State<DatabaseState>) -> Result<Vec<Usuario>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, username, role, nome, nome_os FROM usuarios ORDER BY nome ASC")
        .map_err(|e| e.to_string())?;

    let usuarios = stmt
        .query_map([], |r| {
            Ok(Usuario {
                id: r.get(0)?,
                username: r.get(1)?,
                role: r.get(2)?,
                nome: r.get(3)?,
                nome_os: r.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(usuarios)
}

#[tauri::command]
pub fn listar_nomes_os(state: tauri::State<DatabaseState>) -> Result<Vec<String>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT DISTINCT nome_os FROM usuarios WHERE nome_os IS NOT NULL AND nome_os != '' ORDER BY nome_os ASC")
        .map_err(|e| e.to_string())?;

    let nomes = stmt
        .query_map([], |r| r.get::<_, String>(0))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(nomes)
}

#[tauri::command]
pub fn salvar_funcionario(
    nome: String,
    nome_os: String,
    role: String,
    state: tauri::State<DatabaseState>,
) -> Result<i64, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let dummy_username = format!(
        "func_{}",
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis()
    );
    let dummy_password = "123";

    conn.execute(
        "INSERT INTO usuarios (nome, nome_os, username, password, role) VALUES (?, ?, ?, ?, ?)",
        params![nome, nome_os, dummy_username, dummy_password, role],
    )
    .map_err(|e| e.to_string())?;

    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub fn atualizar_funcionario(
    id: i64,
    nome: String,
    nome_os: String,
    role: String,
    state: tauri::State<DatabaseState>,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE usuarios SET nome = ?, nome_os = ?, role = ? WHERE id = ?",
        params![nome, nome_os, role, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn excluir_funcionario(id: i64, state: tauri::State<DatabaseState>) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM usuarios WHERE id = ?", [id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ----------------------------------------------------
// CONFIGURAÇÕES & SISTEMA COMMANDS
// ----------------------------------------------------

#[tauri::command]
pub fn get_configuracoes(state: tauri::State<DatabaseState>) -> Result<Configuracoes, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.query_row(
        "SELECT id, nome_sistema, empresa_nome, empresa_endereco, empresa_telefone,
                logo_path, tema_escuro, senha_painel, normas_os
         FROM configuracoes WHERE id = 1",
        [],
        |r| {
            Ok(Configuracoes {
                id: r.get(0)?,
                nome_sistema: r.get(1)?,
                empresa_nome: r.get(2)?,
                empresa_endereco: r.get(3)?,
                empresa_telefone: r.get(4)?,
                logo_path: r.get(5)?,
                tema_escuro: r.get(6)?,
                senha_painel: r.get(7)?,
                normas_os: r.get(8)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn toggle_tema(state: tauri::State<DatabaseState>) -> Result<i64, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let tema_atual: i64 = conn
        .query_row("SELECT tema_escuro FROM configuracoes WHERE id = 1", [], |r| {
            r.get(0)
        })
        .unwrap_or(0);

    let novo_tema = if tema_atual == 1 { 0 } else { 1 };
    conn.execute(
        "UPDATE configuracoes SET tema_escuro = ? WHERE id = 1",
        [novo_tema],
    )
    .map_err(|e| e.to_string())?;

    Ok(novo_tema)
}

#[tauri::command]
pub fn salvar_identidade(
    empresa_nome: String,
    empresa_endereco: String,
    empresa_telefone: String,
    normas_os: String,
    state: tauri::State<DatabaseState>,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE configuracoes SET empresa_nome = ?, empresa_endereco = ?, empresa_telefone = ?, normas_os = ? WHERE id = 1",
        params![empresa_nome, empresa_endereco, empresa_telefone, normas_os],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn base64_decode(input: &str) -> Option<Vec<u8>> {
    let mut table = [0xFFu8; 256];
    const CHARSET: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    for (i, &b) in CHARSET.iter().enumerate() {
        table[b as usize] = i as u8;
    }

    let clean: Vec<u8> = input.bytes().filter(|&b| !b.is_ascii_whitespace()).collect();
    if clean.is_empty() || clean.len() % 4 != 0 {
        return None;
    }

    let mut out = Vec::with_capacity(clean.len() * 3 / 4);
    for chunk in clean.chunks(4) {
        let b0 = table[chunk[0] as usize];
        let b1 = table[chunk[1] as usize];
        if b0 == 0xFF || b1 == 0xFF {
            return None;
        }

        let b2 = if chunk[2] == b'=' { 0 } else { table[chunk[2] as usize] };
        let b3 = if chunk[3] == b'=' { 0 } else { table[chunk[3] as usize] };
        if (chunk[2] != b'=' && b2 == 0xFF) || (chunk[3] != b'=' && b3 == 0xFF) {
            return None;
        }

        out.push((b0 << 2) | (b1 >> 4));
        if chunk[2] != b'=' {
            out.push((b1 << 4) | (b2 >> 2));
        }
        if chunk[3] != b'=' {
            out.push((b2 << 6) | b3);
        }
    }
    Some(out)
}

#[tauri::command]
pub fn salvar_logo(
    base64_data: String,
    extensao: String,
    state: tauri::State<DatabaseState>,
) -> Result<String, String> {
    let clean_b64 = if let Some(idx) = base64_data.find(',') {
        &base64_data[idx + 1..]
    } else {
        &base64_data
    };

    let bytes = match base64_decode(clean_b64) {
        Some(b) => b,
        None => return Err("Falha ao decodificar arquivo de imagem.".into()),
    };

    let ext = match extensao.to_lowercase().as_str() {
        "jpg" | "jpeg" => "jpg",
        "webp" => "webp",
        "svg" => "svg",
        _ => "png",
    };

    let millis = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    let filename = format!("logo-{}.{}", millis, ext);

    let uploads_dir = if let Some(roaming) = dirs::data_dir() {
        roaming.join("ordens-de-servico-cobrinha").join("uploads")
    } else if let Some(parent) = state.path.parent().and_then(|p| p.parent()) {
        parent.join("uploads")
    } else {
        std::path::PathBuf::from("uploads")
    };

    let _ = std::fs::create_dir_all(&uploads_dir);
    let target_file = uploads_dir.join(&filename);
    std::fs::write(&target_file, &bytes).map_err(|e| format!("Erro ao gravar logo: {}", e))?;

    let db_path_str = format!("/uploads/{}", filename);
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE configuracoes SET logo_path = ? WHERE id = 1",
        [&db_path_str],
    )
    .map_err(|e| e.to_string())?;

    Ok(db_path_str)
}

#[tauri::command]
pub fn remover_logo(state: tauri::State<DatabaseState>) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("UPDATE configuracoes SET logo_path = NULL WHERE id = 1", [])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_logo_base64(state: tauri::State<DatabaseState>) -> Result<Option<String>, String> {
    let config = get_configuracoes(state.clone())?;
    let logo_base64 = resolver_logo_base64(&config.logo_path, &state.path);
    Ok(logo_base64)
}

#[tauri::command]
pub fn salvar_nome_sistema(
    nome_sistema: String,
    state: tauri::State<DatabaseState>,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE configuracoes SET nome_sistema = ? WHERE id = 1",
        [nome_sistema],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn verificar_senha_painel(
    senha: String,
    state: tauri::State<DatabaseState>,
) -> Result<bool, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let senha_correta: String = conn
        .query_row(
            "SELECT COALESCE(senha_painel, 'admin') FROM configuracoes WHERE id = 1",
            [],
            |r| r.get(0),
        )
        .unwrap_or_else(|_| "admin".to_string());

    Ok(senha == senha_correta)
}

#[tauri::command]
pub fn alterar_senha_painel(
    senha_atual: String,
    nova_senha: String,
    state: tauri::State<DatabaseState>,
) -> Result<(), String> {
    if nova_senha.len() < 3 {
        return Err("A nova senha deve ter no mínimo 3 caracteres.".into());
    }

    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let senha_correta: String = conn
        .query_row(
            "SELECT COALESCE(senha_painel, 'admin') FROM configuracoes WHERE id = 1",
            [],
            |r| r.get(0),
        )
        .unwrap_or_else(|_| "admin".to_string());

    if senha_atual != senha_correta {
        return Err("A senha atual está incorreta.".into());
    }

    conn.execute(
        "UPDATE configuracoes SET senha_painel = ? WHERE id = 1",
        [nova_senha],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn get_tamanho_banco(state: tauri::State<DatabaseState>) -> Result<String, String> {
    if state.path.exists() {
        if let Ok(metadata) = std::fs::metadata(&state.path) {
            let bytes = metadata.len();
            if bytes < 1024 * 1024 {
                return Ok(format!("{:.2} KB", bytes as f64 / 1024.0));
            } else {
                return Ok(format!("{:.2} MB", bytes as f64 / (1024.0 * 1024.0)));
            }
        }
    }
    Ok("Desconhecido".into())
}

#[tauri::command]
pub fn limpar_ordens_servico(state: tauri::State<DatabaseState>) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM ordens", []).map_err(|e| e.to_string())?;
    let _ = conn.execute("VACUUM", []);
    Ok(())
}

#[tauri::command]
pub fn limpar_todos_clientes(state: tauri::State<DatabaseState>) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM clientes", []).map_err(|e| e.to_string())?;
    let _ = conn.execute("VACUUM", []);
    Ok(())
}
