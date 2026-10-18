# Estheros

App de escritorio para Windows de productividad personal con estética cozy / coquette: calendario, diario y to-do list, con themes Dark, White y Pink. Todos los datos viven en el equipo (SQLite local).

## Requisitos

- Windows 10/11 con WebView2 Runtime (incluido en Windows 11 y en Windows 10 actualizado).
- Node.js 22 o superior y npm 11.
- Rust stable (toolchain MSVC) instalado con `rustup`.
- Visual Studio Build Tools con la carga de trabajo "Desarrollo para el escritorio con C++".

## Primeros pasos

```bash
npm install
npm run tauri dev
```

La primera compilación de Rust tarda varios minutos; las siguientes son incrementales.

## Comandos

| Comando               | Qué hace                                                 |
| --------------------- | -------------------------------------------------------- |
| `npm run tauri dev`   | Arranca la app de escritorio en modo desarrollo          |
| `npm run dev`         | Solo el frontend en Vite (`http://localhost:1420`)       |
| `npm run build`       | Typecheck y build del frontend en `dist/`                |
| `npm run tauri build` | Genera los instaladores `.msi` y `.exe`                  |
| `npm run check`       | Typecheck + lint + tests unitarios                       |
| `npm run typecheck`   | Solo TypeScript                                          |
| `npm run lint`        | ESLint                                                   |
| `npm run format`      | Prettier sobre todo el proyecto                          |
| `npm test`            | Tests unitarios (Vitest)                                 |
| `npm run test:watch`  | Vitest en modo watch                                     |
| `npm run e2e`         | Tests end-to-end (Playwright) contra el servidor de Vite |

Antes de cada commit, Husky ejecuta lint-staged (ESLint con `--fix` y Prettier sobre los archivos preparados).

## Estructura

```
src/
  app/        bootstrap, router, providers y layout del shell
  features/   today, calendar, journal, todo, settings, onboarding
  shared/     ui, theme, db, hotkeys, i18n, lib, icons
  styles/     globals.css (Tailwind v4 + mapeo de tokens) y fuentes
  dev/        páginas internas de desarrollo
src-tauri/    backend Rust mínimo, migraciones SQL, configuración de Tauri
tests/        unit/ (Vitest) y e2e/ (Playwright)
```

Commits con Conventional Commits (`feat(todo): ...`, `fix(calendar): ...`), un scope por feature o área.
