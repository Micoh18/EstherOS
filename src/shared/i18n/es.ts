/**
 * Spanish UI strings. Flat map of key -> string; `{name}` placeholders are filled by `t()`.
 * Each feature adds its keys under its own prefix (`todo.`, `calendar.`, `journal.`...).
 */
export const es = {
  "app.name": "Estheros",

  // Shell: title bar
  "shell.titleBar.minimize": "Minimizar",
  "shell.titleBar.maximize": "Maximizar",
  "shell.titleBar.restore": "Restaurar",
  "shell.titleBar.close": "Cerrar",
  "shell.titleBar.cycleTheme": "Cambiar theme (actual: {theme})",
  "shell.titleBar.chordPending": "{keys} …",

  // Shell: sidebar
  "shell.sidebar.label": "Navegación principal",
  "shell.sidebar.collapse": "Contraer barra lateral",
  "shell.sidebar.expand": "Expandir barra lateral",

  // Navigation entries
  "nav.today": "Hoy",
  "nav.calendar": "Calendario",
  "nav.journal": "Diario",
  "nav.todo": "Tareas",
  "nav.settings": "Ajustes",

  // Placeholder pages
  "shell.page.placeholder": "Esta pantalla está en construcción ♡",
  "shell.page.devUi": "Galería de componentes",
  "shell.page.devUiMissing": "La galería de componentes todavía no existe.",

  // Shortcuts sheet placeholder
  "shell.shortcuts.title": "Atajos de teclado",
  "shell.shortcuts.placeholder": "La hoja de atajos llegará pronto. Pulsa Esc para cerrar.",

  // Themes
  "theme.pink": "Pink",
  "theme.white": "White",
  "theme.dark": "Dark",
  "theme.system": "Sistema",

  // Hotkeys: scopes
  "hotkeys.scope.global": "Global",
  "hotkeys.scope.today": "Hoy",
  "hotkeys.scope.calendar": "Calendario",
  "hotkeys.scope.journal": "Diario",
  "hotkeys.scope.editor": "Editor",
  "hotkeys.scope.todo": "Tareas",
  "hotkeys.scope.todo.row": "Fila de tarea",
  "hotkeys.scope.todo.detail": "Detalle de tarea",
  "hotkeys.scope.dialog": "Diálogo",

  // Hotkeys: key names shown to the user
  "hotkeys.key.space": "Espacio",
  "hotkeys.key.escape": "Esc",
  "hotkeys.key.delete": "Supr",
  "hotkeys.key.backspace": "Retroceso",
  "hotkeys.key.chordSeparator": " luego ",

  // Hotkeys: action labels (global)
  "hotkeys.action.nav.today": "Ir a Hoy",
  "hotkeys.action.nav.calendar": "Ir a Calendario",
  "hotkeys.action.nav.journal": "Ir a Diario",
  "hotkeys.action.nav.todo": "Ir a Tareas",
  "hotkeys.action.nav.settings": "Ir a Ajustes",
  "hotkeys.action.app.openSettings": "Abrir Ajustes",
  "hotkeys.action.app.newItem": "Nuevo según contexto",
  "hotkeys.action.theme.cycle": "Rotar theme",
  "hotkeys.action.app.toggleSidebar": "Mostrar/ocultar barra lateral",
  "hotkeys.action.app.showShortcuts": "Mostrar hoja de atajos",
  "hotkeys.action.app.escape": "Cerrar diálogo / cancelar",

  // Hotkeys: calendar
  "hotkeys.action.calendar.goToToday": "Ir a hoy",
  "hotkeys.action.calendar.prev": "Período anterior",
  "hotkeys.action.calendar.next": "Período siguiente",
  "hotkeys.action.calendar.viewMonth": "Vista mes",
  "hotkeys.action.calendar.viewWeek": "Vista semana",
  "hotkeys.action.calendar.viewDay": "Vista día",
  "hotkeys.action.calendar.newEvent": "Nuevo evento en día seleccionado",
  "hotkeys.action.calendar.openJournal": "Abrir diario del día seleccionado",
  "hotkeys.action.calendar.togglePanel": "Mostrar/ocultar panel lateral",

  // Hotkeys: journal
  "hotkeys.action.journal.newEntry": "Nueva entrada en el día seleccionado",
  "hotkeys.action.journal.search": "Foco en buscador",
  "hotkeys.action.journal.toggleFavorite": "Marcar/desmarcar favorita",
  "hotkeys.action.journal.prevEntry": "Entrada anterior",
  "hotkeys.action.journal.nextEntry": "Entrada siguiente",
  "hotkeys.action.journal.goToToday": "Ir a la entrada de hoy",
  "hotkeys.action.journal.mood1": "Fijar ánimo 1",
  "hotkeys.action.journal.mood2": "Fijar ánimo 2",
  "hotkeys.action.journal.mood3": "Fijar ánimo 3",
  "hotkeys.action.journal.mood4": "Fijar ánimo 4",
  "hotkeys.action.journal.mood5": "Fijar ánimo 5",

  // Hotkeys: editor (handled by Tiptap)
  "hotkeys.action.editor.bold": "Negrita",
  "hotkeys.action.editor.italic": "Cursiva",
  "hotkeys.action.editor.underline": "Subrayado",
  "hotkeys.action.editor.strike": "Tachado",
  "hotkeys.action.editor.heading2": "Título 2",
  "hotkeys.action.editor.heading3": "Título 3",
  "hotkeys.action.editor.bulletList": "Lista con viñetas",
  "hotkeys.action.editor.orderedList": "Lista numerada",
  "hotkeys.action.editor.taskList": "Lista de tareas",
  "hotkeys.action.editor.blockquote": "Cita",
  "hotkeys.action.editor.link": "Enlace",
  "hotkeys.action.editor.undo": "Deshacer",
  "hotkeys.action.editor.redo": "Rehacer",
  "hotkeys.action.editor.exitToTitle": "Salir del editor al título",

  // Hotkeys: todo
  "hotkeys.action.todo.quickAdd": "Foco en captura rápida",
  "hotkeys.action.todo.newTask": "Nueva tarea",
  "hotkeys.action.todo.newList": "Nueva lista",
  "hotkeys.action.todo.viewToday": "Vista Hoy",
  "hotkeys.action.todo.viewUpcoming": "Vista Próximas",
  "hotkeys.action.todo.viewOverdue": "Vista Vencidas",
  "hotkeys.action.todo.viewAll": "Vista Todas",
  "hotkeys.action.todo.focusPrev": "Mover foco arriba",
  "hotkeys.action.todo.focusNext": "Mover foco abajo",
  "hotkeys.action.todo.toggleDone": "Completar / reabrir",
  "hotkeys.action.todo.openDetail": "Abrir detalle",
  "hotkeys.action.todo.delete": "Eliminar",
  "hotkeys.action.todo.moveUp": "Reordenar arriba",
  "hotkeys.action.todo.moveDown": "Reordenar abajo",
  "hotkeys.action.todo.priorityHigh": "Prioridad alta",
  "hotkeys.action.todo.priorityMedium": "Prioridad media",
  "hotkeys.action.todo.priorityLow": "Prioridad baja",
  "hotkeys.action.todo.priorityNone": "Sin prioridad",
  "hotkeys.action.todo.dueToday": "Fecha hoy",
  "hotkeys.action.todo.dueTomorrow": "Fecha mañana",
  "hotkeys.action.todo.dueClear": "Quitar fecha",
  "hotkeys.action.todo.closeDetail": "Cerrar detalle",

  // Hotkeys: today
  "hotkeys.action.today.newTask": "Nueva tarea para hoy",
  "hotkeys.action.today.openJournal": "Escribir en el diario de hoy",
  "hotkeys.action.today.openCalendar": "Abrir calendario en hoy",
} as const;

export type I18nKey = keyof typeof es;
