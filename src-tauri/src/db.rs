//! Database location and migrations shared by the SQL plugin and the backup commands.

use std::borrow::Cow;
use std::path::PathBuf;

use sqlx::migrate::{Migration as SqlxMigration, MigrationType, Migrator};
use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_sql::{Migration, MigrationKind};

/// Connection string used by the frontend (`Database.load`) and as key of the plugin pool map.
pub const DB_URL: &str = "sqlite:estheros.db";
pub const DB_FILE: &str = "estheros.db";

/// (version, description, sql). Never edit a published migration; append a new one.
const MIGRATIONS: &[(i64, &str, &str)] =
    &[(1, "init", include_str!("../migrations/0001_init.sql"))];

pub fn latest_version() -> i64 {
    MIGRATIONS.last().map(|m| m.0).unwrap_or(0)
}

pub fn plugin_migrations() -> Vec<Migration> {
    MIGRATIONS
        .iter()
        .map(|&(version, description, sql)| Migration {
            version,
            description,
            sql,
            kind: MigrationKind::Up,
        })
        .collect()
}

/// Same migrations as the plugin (identical checksums), for re-running after an import.
pub fn migrator() -> Migrator {
    let migrations = MIGRATIONS
        .iter()
        .map(|&(version, description, sql)| {
            SqlxMigration::new(
                version,
                Cow::Borrowed(description),
                MigrationType::ReversibleUp,
                Cow::Borrowed(sql),
                false,
            )
        })
        .collect::<Vec<_>>();
    Migrator {
        migrations: Cow::Owned(migrations),
        ..Migrator::DEFAULT
    }
}

/// Folder where the SQL plugin stores the database (`app_config_dir`, which on Windows is the
/// same roaming folder as `app_data_dir`).
pub fn data_dir<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    app.path().app_config_dir().map_err(|e| e.to_string())
}

pub fn db_path<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    Ok(data_dir(app)?.join(DB_FILE))
}

pub fn backups_dir<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    Ok(data_dir(app)?.join("backups"))
}

/// Connection URL in the same shape the plugin builds it.
pub fn connection_url(path: &std::path::Path) -> String {
    format!("sqlite:{}", path.to_string_lossy())
}
