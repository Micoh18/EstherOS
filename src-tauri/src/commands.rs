//! Commands the frontend cannot do through the SQL plugin: atomic batches, backup and import.

use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

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
const FILE_RETRIES: u32 = 20;
const FILE_RETRY_DELAY: Duration = Duration::from_millis(100);
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

/// Windows keeps a just-closed file locked for a moment (SQLite finishing its handles, antivirus
/// scanning a fresh copy), so file operations on the database are retried for up to ~2 s.
fn retry_file_op<T>(mut op: impl FnMut() -> std::io::Result<T>) -> std::io::Result<T> {
    let mut attempt = 0;
    loop {
        match op() {
            Err(e) if attempt < FILE_RETRIES && e.kind() != std::io::ErrorKind::NotFound => {
                attempt += 1;
                thread::sleep(FILE_RETRY_DELAY);
            }
            result => return result,
        }
    }
}

/// A stale `-wal` left next to the new file would be replayed onto it, so failing to remove one
/// aborts the swap.
fn remove_sidecars(db_path: &Path) -> CmdResult<()> {
    for suffix in ["-wal", "-shm", "-journal"] {
        let mut sidecar = db_path.as_os_str().to_owned();
        sidecar.push(suffix);
        match retry_file_op(|| fs::remove_file(PathBuf::from(&sidecar))) {
            Err(e) if e.kind() != std::io::ErrorKind::NotFound => return Err(err(e)),
            _ => {}
        }
    }
    Ok(())
}

/// Copies `source` over the live database file through a temp file in the same folder. On error
/// the live file is left as it was.
fn replace_db_file(source: &Path, db_path: &Path) -> CmdResult<()> {
    let tmp = db_path.with_extension("db.importing");
    let swapped = fs::copy(source, &tmp)
        .map_err(err)
        .and_then(|_| remove_sidecars(db_path))
        .and_then(|()| retry_file_op(|| fs::rename(&tmp, db_path)).map_err(err));
    if swapped.is_err() {
        let _ = fs::remove_file(&tmp);
    }
    swapped
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

    if let Err(import_error) = replace_db_file(&source, &db_path) {
        // The live file was not replaced: reopen it as it was.
        return match open_and_migrate(&db_path).await {
            Ok(pool) => {
                map.insert(db::DB_URL.to_string(), DbPool::Sqlite(pool));
                Err(format!(
                    "import_failed: {import_error} (previous data restored)"
                ))
            }
            Err(reopen_error) => Err(format!(
                "restore_failed: {import_error}; reopen failed: {reopen_error}; backup at {}",
                backup_path.to_string_lossy()
            )),
        };
    }

    match open_and_migrate(&db_path).await {
        Ok(pool) => {
            map.insert(db::DB_URL.to_string(), DbPool::Sqlite(pool.clone()));
            drop(map);
            let version: i64 =
                sqlx::query_scalar("SELECT COALESCE(MAX(version), 0) FROM _sqlx_migrations")
                    .fetch_one(&pool)
                    .await
                    .map_err(err)?;
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
                Err(restore_error) => {
                    // Keep a pool on whatever file is there so the app is not left without one.
                    if let Ok(pool) = SqlitePool::connect(&db::connection_url(&db_path)).await {
                        map.insert(db::DB_URL.to_string(), DbPool::Sqlite(pool));
                    }
                    Err(format!(
                        "restore_failed: {import_error}; restore failed: {restore_error}; backup at {}",
                        backup_path.to_string_lossy()
                    ))
                }
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

#[cfg(test)]
mod tests {
    use super::*;

    async fn file_pool(path: &Path) -> SqlitePool {
        SqlitePool::connect(&format!("{}?mode=rwc", db::connection_url(path)))
            .await
            .unwrap()
    }

    async fn write_value(path: &Path, value: &str) {
        let pool = file_pool(path).await;
        sqlx::query("PRAGMA journal_mode = WAL")
            .execute(&pool)
            .await
            .unwrap();
        sqlx::query("CREATE TABLE IF NOT EXISTS t (v TEXT)")
            .execute(&pool)
            .await
            .unwrap();
        sqlx::query("DELETE FROM t").execute(&pool).await.unwrap();
        sqlx::query("INSERT INTO t (v) VALUES (?)")
            .bind(value)
            .execute(&pool)
            .await
            .unwrap();
        pool.close().await;
    }

    #[test]
    fn replaces_a_database_right_after_its_pool_closes() {
        tauri::async_runtime::block_on(async {
            let dir = std::env::temp_dir().join(format!("estheros-replace-{}", timestamp()));
            fs::create_dir_all(&dir).unwrap();
            let live = dir.join("estheros.db");
            let source = dir.join("source.db");
            write_value(&source, "imported").await;

            // Same sequence as `import_db`: a busy pool on the live file, closed just before the swap.
            let pool = file_pool(&live).await;
            sqlx::query("PRAGMA journal_mode = WAL")
                .execute(&pool)
                .await
                .unwrap();
            sqlx::query("CREATE TABLE t (v TEXT)")
                .execute(&pool)
                .await
                .unwrap();
            sqlx::query("INSERT INTO t (v) VALUES ('old')")
                .execute(&pool)
                .await
                .unwrap();
            pool.close().await;
            replace_db_file(&source, &live).unwrap();

            let pool = file_pool(&live).await;
            let value: String = sqlx::query_scalar("SELECT v FROM t")
                .fetch_one(&pool)
                .await
                .unwrap();
            pool.close().await;
            assert_eq!(value, "imported");
            assert!(!live.with_extension("db.importing").exists());
            let _ = fs::remove_dir_all(&dir);
        });
    }

    #[test]
    fn leaves_the_live_file_alone_when_the_source_is_missing() {
        tauri::async_runtime::block_on(async {
            let dir = std::env::temp_dir().join(format!("estheros-missing-{}", timestamp()));
            fs::create_dir_all(&dir).unwrap();
            let live = dir.join("estheros.db");
            write_value(&live, "kept").await;

            assert!(replace_db_file(&dir.join("nope.db"), &live).is_err());

            let pool = file_pool(&live).await;
            let value: String = sqlx::query_scalar("SELECT v FROM t")
                .fetch_one(&pool)
                .await
                .unwrap();
            pool.close().await;
            assert_eq!(value, "kept");
            let _ = fs::remove_dir_all(&dir);
        });
    }
}
