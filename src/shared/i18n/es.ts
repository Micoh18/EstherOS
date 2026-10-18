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

  // To-do: navigation
  "todo.nav.label": "Listas y vistas de tareas",
  "todo.view.today": "Hoy",
  "todo.view.upcoming": "Próximas",
  "todo.view.overdue": "Vencidas",
  "todo.view.all": "Todas",
  "todo.lists.label": "Listas",
  "todo.lists.new": "Lista",
  "todo.lists.archived": "Archivadas ({count})",
  "todo.lists.openCount": "{count} abiertas",

  // To-do: quick capture
  "todo.quickAdd.label": "Nueva tarea",
  "todo.quickAdd.placeholder": "Añadir una tarea…",
  "todo.quickAdd.hint": "!alta · !media · !baja · @hoy · @mañana",

  // To-do: sections and empty states
  "todo.section.overdue": "Vencidas",
  "todo.section.today": "Para hoy",
  "todo.section.later": "Más adelante",
  "todo.section.completed": "Completadas ({count})",
  "todo.section.showMore": "Ver más",
  "todo.section.showLess": "Ver menos",
  "todo.empty.list": "Todo en orden por aquí ♡",
  "todo.empty.today": "Día despejado. ¿Un poco de diario?",
  "todo.empty.todayLink": "Escribir en el diario",
  "todo.empty.overdue": "Nada pendiente del pasado ✨",
  "todo.empty.upcoming": "Nada en el horizonte por ahora ♡",
  "todo.empty.all": "Todo en orden por aquí ♡",

  // To-do: sorting and priority
  "todo.sort.label": "Ordenar por",
  "todo.sort.manual": "Manual",
  "todo.sort.due": "Fecha",
  "todo.sort.priority": "Prioridad",
  "todo.priority.none": "Sin prioridad",
  "todo.priority.low": "Baja",
  "todo.priority.medium": "Media",
  "todo.priority.high": "Alta",
  "todo.priority.flag": "Prioridad {level}",

  // To-do: due dates
  "todo.due.today": "Hoy",
  "todo.due.tomorrow": "Mañana",
  "todo.due.yesterday": "Ayer",
  "todo.due.daysAgo": "Hace {count} días",

  // To-do: task row
  "todo.row.complete": "Marcar «{title}» como hecha",
  "todo.row.reopen": "Reabrir «{title}»",
  "todo.row.subtasks": "{done}/{total}",
  "todo.row.expand": "Mostrar subtareas",
  "todo.row.collapse": "Ocultar subtareas",
  "todo.row.drag": "Arrastrar para reordenar",
  "todo.row.confirmDelete": "¿Eliminar «{title}»?",
  "todo.action.delete": "Eliminar",
  "todo.action.cancel": "Cancelar",
  "todo.action.save": "Guardar",

  // To-do: lists
  "todo.list.menu": "Opciones de la lista",
  "todo.list.rename": "Renombrar",
  "todo.list.color": "Color",
  "todo.list.icon": "Icono",
  "todo.list.noColor": "Sin color",
  "todo.list.archive": "Archivar",
  "todo.list.unarchive": "Desarchivar",
  "todo.list.archivedBadge": "Archivada",
  "todo.list.delete": "Eliminar lista",
  "todo.list.deleteTitle": "¿Eliminar «{name}»?",
  "todo.list.deleteBody": "Sus tareas, abiertas y completadas, se moverán a Inbox.",
  "todo.list.name": "Nombre de la lista",
  "todo.list.namePlaceholder": "Casa, Trabajo, Yo…",
  "todo.list.nameTaken": "Ya tienes una lista con ese nombre.",
  "todo.list.create": "Crear lista",
  "todo.list.newTitle": "Nueva lista",
  "todo.list.newDescription": "Un rincón para un área de tu vida.",

  // To-do: palette and icons
  "todo.color.rose": "Rosa",
  "todo.color.lavender": "Lavanda",
  "todo.color.sage": "Salvia",
  "todo.color.butter": "Mantequilla",
  "todo.color.sky": "Cielo",
  "todo.color.peach": "Durazno",
  "todo.icon.inbox": "Bandeja",
  "todo.icon.heart": "Corazón",
  "todo.icon.home": "Casa",
  "todo.icon.work": "Trabajo",
  "todo.icon.star": "Estrella",
  "todo.icon.book": "Libro",
  "todo.icon.flower": "Flor",
  "todo.icon.coffee": "Café",
  "todo.icon.cart": "Compras",
  "todo.icon.sparkles": "Brillos",
  "todo.icon.leaf": "Hoja",
  "todo.icon.list": "Lista",

  // To-do: detail panel
  "todo.detail.label": "Detalle de la tarea",
  "todo.detail.close": "Cerrar detalle",
  "todo.detail.title": "Título",
  "todo.detail.list": "Lista",
  "todo.detail.due": "Fecha",
  "todo.detail.time": "Hora",
  "todo.detail.clearTime": "Quitar hora",
  "todo.detail.priority": "Prioridad",
  "todo.detail.tags": "Etiquetas",
  "todo.detail.addTag": "Añadir etiqueta…",
  "todo.detail.notes": "Notas",
  "todo.detail.notesPlaceholder": "Un poco de contexto…",
  "todo.detail.subtasks": "Subtareas",
  "todo.detail.addSubtask": "Añadir subtarea…",
  "todo.detail.deleteSubtask": "Eliminar subtarea «{title}»",
  "todo.detail.created": "Creada el {date}",
  "todo.detail.completed": "Completada el {date}",
  "todo.detail.suggestDone": "Todas las subtareas están hechas. ¿Marcar como hecha?",
  "todo.detail.markDone": "Marcar como hecha",
  "todo.detail.delete": "Eliminar tarea",
} as const;

export type I18nKey = keyof typeof es;
