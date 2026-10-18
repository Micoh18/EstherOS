//! Commands the frontend cannot do through the SQL plugin: atomic batches, backup and import.

use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use sqlx::sqlite::{SqliteConnectOptions, SqlitePool};
use sqlx::{ConnectOptions, Connection, Row, Sqlite};
use tauri::{AppHandle, Runtime, State};
use tauri_plugin_opener::OpenerExt;
use tauri_plugin_sql::{DbInstances, DbPool};

use crate::db;

const SQLITE_HEADER: &[u8; 16] = b"SQLite format 3\0";
const KEEP_PRE_IMPORT_BACKUPS: usize = 5;
const REQUIRED_TABLES: &[&str] = &[
    "_sqlx_migrations",
    "setting",
    "tag",
    "event",
    "event_tag",
    "journal_entry",
    "journal_tag",
    "todo_list",
    "task",
    "task_tag",
];

type CmdResult<T> = Result<T, String>;

fn err<E: std::fmt::Display>(e: E) -> String {
    e.to_string()
}

#[derive(Debug, Deserialize)]
pub struct Statement {
    sql: String,
    #[serde(default)]
    params: Vec<JsonValue>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportResult {
    backup_path: String,
    schema_version: i64,
}

#[allow(unreachable_patterns)]
async fn current_pool(instances: &DbInstances) -> CmdResult<SqlitePool> {
    match instances.0.read().await.get(db::DB_URL) {
        Some(DbPool::Sqlite(pool)) => Ok(pool.clone()),
        Some(_) => Err("database is not a SQLite pool".into()),
        None => Err("database not loaded".into()),
    }
}

/// Binds values exactly like the SQL plugin does, so batch and plugin statements agree.
fn bind_values<'q>(
    mut query: sqlx::query::Query<'q, Sqlite, sqlx::sqlite::SqliteArguments<'q>>,
    values: &'q [JsonValue],
) -> sqlx::query::Query<'q, Sqlite, sqlx::sqlite::SqliteArguments<'q>> {
    for value in values {
        query = match value {
            JsonValue::Null => query.bind(None::<String>),
            JsonValue::String(s) => query.bind(s.as_str()),
            JsonValue::Number(n) => match n.as_i64() {
                Some(i) => query.bind(i),
                None => query.bind(n.as_f64().unwrap_or_default()),
            },
            JsonValue::Bool(b) => query.bind(i64::from(*b)),
            other => query.bind(other.to_string()),
        };
    }
    query
}

/// Runs every statement inside one transaction. The plugin pool hands out several connections,
/// so a BEGIN/COMMIT sent from JavaScript is not guaranteed to stay on the same one.
#[tauri::command]
pub async fn db_batch(
    instances: State<'_, DbInstances>,
    statements: Vec<Statement>,
) -> CmdResult<u64> {
    let pool = current_pool(&instances).await?;
    let mut tx = pool.begin().await.map_err(err)?;
    let mut affected = 0;
    for statement in &statements {
        let query = bind_values(sqlx::query(&statement.sql), &statement.params);
        affected += query.execute(&mut *tx).await.map_err(err)?.rows_affected();
    }
    tx.commit().await.map_err(err)?;
    Ok(affected)
}

async fn vacuum_into(pool: &SqlitePool, target: &Path) -> CmdResult<()> {
    if target.exists() {
        fs::remove_file(target).map_err(err)?;
    }
    sqlx::query("VACUUM INTO ?")
        .bind(target.to_string_lossy().into_owned())
        .execute(pool)
        .await
        .map_err(err)?;
    Ok(())
}

#[tauri::command]
pub async fn export_db(instances: State<'_, DbInstances>, target_path: String) -> CmdResult<()> {
    let pool = current_pool(&instances).await?;
    vacuum_into(&pool, Path::new(&target_path)).await
}

/// Checks the SQLite header, integrity, required tables and schema version of a backup file.
async fn validate_backup(source: &Path) -> CmdResult<()> {
    let mut header = [0u8; 16];
    fs::File::open(source)
        .and_then(|mut f| f.read_exact(&mut header))
        .map_err(|_| "not_sqlite: the file is not a SQLite database".to_string())?;
    if &header != SQLITE_HEADER {
        return Err("not_sqlite: the file is not a SQLite database".into());
    }

    let mut conn = SqliteConnectOptions::new()
        .filename(source)
        .read_only(true)
        .connect()
        .await
        .map_err(|e| format!("not_sqlite: {e}"))?;

    let check: String = sqlx::query_scalar("PRAGMA quick_check")
        .fetch_one(&mut conn)
        .await
        .map_err(|e| format!("corrupt: {e}"))?;
    if check != "ok" {
        return Err(format!("corrupt: {check}"));
    }

    let rows = sqlx::query("SELECT name FROM sqlite_master WHERE type = 'table'")
        .fetch_all(&mut conn)
        .await
        .map_err(err)?;
    let tables: Vec<String> = rows.iter().map(|r| r.get::<String, _>("name")).collect();
    let missing: Vec<&str> = REQUIRED_TABLES
        .iter()
        .copied()
        .filter(|t| !tables.iter().any(|name| name == t))
        .collect();
    if !missing.is_empty() {
        return Err(format!("missing_tables: {}", missing.join(", ")));
    }

    let version: Option<i64> = sqlx::query_scalar("SELECT MAX(version) FROM _sqlx_migrations")
        .fetch_one(&mut conn)
        .await
        .map_err(err)?;
    if version.unwrap_or(0) > db::latest_version() {
        return Err("newer_version: the backup comes from a newer version of the app".into());
    }

    conn.close().await.map_err(err)?;
    Ok(())
}

fn remove_sidecars(db_path: &Path) {
    for suffix in ["-wal", "-shm", "-journal"] {
        let mut sidecar = db_path.as_os_str().to_owned();
        sidecar.push(suffix);
        let _ = fs::remove_file(PathBuf::from(sidecar));
    }
}

/// Copies `source` over the live database file through a temp file in the same folder.
fn replace_db_file(source: &Path, db_path: &Path) -> CmdResult<()> {
    let tmp = db_path.with_extension("db.importing");
    fs::copy(source, &tmp).map_err(err)?;
    remove_sidecars(db_path);
    fs::rename(&tmp, db_path).map_err(err)
}

async fn open_and_migrate(db_path: &Path) -> CmdResult<SqlitePool> {
    let pool = SqlitePool::connect(&db::connection_url(db_path))
        .await
        .map_err(err)?;
    db::migrator().run(&pool).await.map_err(err)?;
    Ok(pool)
}

fn timestamp() -> String {
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);
    let (days, rem) = (secs.div_euclid(86_400), secs.rem_euclid(86_400));
    // Civil date from days since 1970-01-01 (Howard Hinnant's algorithm).
    let z = days + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let day = doy - (153 * mp + 2) / 5 + 1;
    let month = if mp < 10 { mp + 3 } else { mp - 9 };
    let year = yoe + era * 400 + i64::from(month <= 2);
    format!(
        "{year:04}{month:02}{day:02}-{:02}{:02}{:02}",
        rem / 3600,
        rem % 3600 / 60,
        rem % 60
    )
}

fn prune_backups(dir: &Path) {
    let Ok(entries) = fs::read_dir(dir) else {
        return;
    };
    let mut backups: Vec<PathBuf> = entries
        .filter_map(|e| e.ok().map(|e| e.path()))
        .filter(|p| {
            p.file_name()
                .and_then(|n| n.to_str())
                .is_some_and(|n| n.starts_with("pre-import-") && n.ends_with(".db"))
        })
        .collect();
    // Names embed a sortable UTC timestamp, so lexical order is chronological.
    backups.sort();
    let excess = backups.len().saturating_sub(KEEP_PRE_IMPORT_BACKUPS);
    for old in backups.into_iter().take(excess) {
        let _ = fs::remove_file(old);
    }
}

#[tauri::command]
pub async fn import_db<R: Runtime>(
    app: AppHandle<R>,
    instances: State<'_, DbInstances>,
    source_path: String,
) -> CmdResult<ImportResult> {
    let source = PathBuf::from(&source_path);
    validate_backup(&source).await?;

    let db_path = db::db_path(&app)?;
    let backups = db::backups_dir(&app)?;
    fs::create_dir_all(&backups).map_err(err)?;
    let backup_path = backups.join(format!("pre-import-{}.db", timestamp()));

    // Hold the write lock so no plugin query runs while the file is swapped.
    let mut map = instances.0.write().await;
    #[allow(unreachable_patterns)]
    let current = match map.get(db::DB_URL) {
        Some(DbPool::Sqlite(pool)) => pool.clone(),
        _ => return Err("database not loaded".into()),
    };
    vacuum_into(&current, &backup_path).await?;
    current.close().await;

    let swapped = match replace_db_file(&source, &db_path) {
        Ok(()) => open_and_migrate(&db_path).await,
        Err(e) => Err(e),
    };

    match swapped {
        Ok(pool) => {
            let version: i64 =
                sqlx::query_scalar("SELECT COALESCE(MAX(version), 0) FROM _sqlx_migrations")
                    .fetch_one(&pool)
                    .await
                    .map_err(err)?;
            map.insert(db::DB_URL.to_string(), DbPool::Sqlite(pool));
            drop(map);
            prune_backups(&backups);
            Ok(ImportResult {
                backup_path: backup_path.to_string_lossy().into_owned(),
                schema_version: version,
            })
        }
        Err(import_error) => {
            let reopened = match replace_db_file(&backup_path, &db_path) {
                Ok(()) => open_and_migrate(&db_path).await,
                Err(e) => Err(e),
            };
            match reopened {
                Ok(pool) => {
                    map.insert(db::DB_URL.to_string(), DbPool::Sqlite(pool));
                    Err(format!(
                        "import_failed: {import_error} (previous data restored)"
                    ))
                }
                Err(restore_error) => Err(format!(
                    "import_failed: {import_error}; restore failed: {restore_error}; backup at {}",
                    backup_path.to_string_lossy()
                )),
            }
        }
    }
}

#[tauri::command]
pub fn open_data_folder<R: Runtime>(app: AppHandle<R>) -> CmdResult<()> {
    let dir = db::data_dir(&app)?;
    fs::create_dir_all(&dir).map_err(err)?;
    app.opener()
        .open_path(dir.to_string_lossy(), None::<&str>)
        .map_err(err)
}

#[tauri::command]
pub fn db_size_bytes<R: Runtime>(app: AppHandle<R>) -> CmdResult<u64> {
    let db_path = db::db_path(&app)?;
    let mut total = fs::metadata(&db_path).map(|m| m.len()).unwrap_or(0);
    let mut wal = db_path.as_os_str().to_owned();
    wal.push("-wal");
    total += fs::metadata(PathBuf::from(wal))
        .map(|m| m.len())
        .unwrap_or(0);
    Ok(total)
}
