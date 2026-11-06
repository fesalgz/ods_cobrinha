mod db;

use std::sync::Mutex;

#[tauri::command]
fn get_database_info(state: tauri::State<db::DatabaseState>) -> Result<db::DatabaseInfo, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let clientes_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM clientes", [], |r| r.get(0))
        .unwrap_or(0);
    let ordens_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM ordens", [], |r| r.get(0))
        .unwrap_or(0);
    let usuarios_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM usuarios", [], |r| r.get(0))
        .unwrap_or(0);

    let (empresa_nome, nome_sistema): (Option<String>, Option<String>) = conn
        .query_row(
            "SELECT empresa_nome, nome_sistema FROM configuracoes WHERE id = 1",
            [],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .unwrap_or((None, None));

    Ok(db::DatabaseInfo {
        db_path: state.path.to_string_lossy().to_string(),
        clientes_count,
        ordens_count,
        usuarios_count,
        empresa_nome,
        nome_sistema,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db_path = db::resolve_db_path();
    let conn = db::init_db(&db_path).expect("Falha ao inicializar o banco de dados SQLite");

    let db_state = db::DatabaseState {
        conn: Mutex::new(conn),
        path: db_path,
    };

    tauri::Builder::default()
        .manage(db_state)
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_database_info
        ])
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
