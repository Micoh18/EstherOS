# Changelog

Todos los cambios relevantes de Estheros. El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa [versionado semántico](https://semver.org/lang/es/).

## [1.0.0] - 2026-10-19

Primera versión. Todo funciona sin conexión y los datos se guardan solo en el equipo.

### Hoy

- Pantalla de inicio con saludo según la hora y tu nombre, fecha larga y decoración de lazos.
- Tarjeta «Hoy en tu calendario» con los eventos del día en orden y acceso directo para crear uno.
- «Pendientes de hoy» con las vencidas aparte, casillas que funcionan en el momento y captura rápida con fecha de hoy.
- «Tu diario» con la vista previa de la entrada del día, su estado de ánimo y la racha de días seguidos escribiendo.
- Fila «Mañana» con lo que viene al día siguiente.
- El día cambia solo a medianoche y al volver a la ventana.

### Calendario

- Vistas de mes, semana y día con navegación por períodos y vuelta a hoy.
- Eventos de día completo o con hora, seis colores, etiquetas, lugar y descripción.
- Repetición diaria, semanal, mensual o anual, con fecha de fin opcional.
- Registro de cosas que ya pasaron, dibujadas con borde punteado.
- Crear haciendo clic o arrastrando en una franja; mover eventos arrastrándolos entre días.
- Panel del día con sus eventos, sus tareas y su entrada de diario.
- Las tareas con fecha aparecen en semana y día.
- Navegación por teclado en la rejilla del mes.

### Diario

- Una o varias entradas por día con editor de texto enriquecido: negrita, cursiva, listas, citas, títulos y enlaces.
- Guardado automático mientras escribes y al salir o cerrar la ventana.
- Estado de ánimo, favoritas y etiquetas.
- Búsqueda de texto con filtros por etiqueta y favoritas.
- Mini calendario con los días en los que escribiste.

### Tareas

- Captura rápida con prioridad y fecha en el texto: `!alta`, `!media`, `!baja`, `@hoy`, `@mañana`.
- Vistas Hoy, Próximas, Vencidas y Todas, más listas propias con color e icono.
- Subtareas, notas, hora, prioridad y etiquetas en el panel de detalle.
- Completar con animación; las completadas se guardan en su propia sección.
- Orden manual arrastrando o con el teclado, por fecha o por prioridad.
- Archivar listas; al eliminar una lista sus tareas pasan a Inbox.

### Ajustes y bienvenida

- Bienvenida en tres pasos la primera vez: tu nombre, tu tema y un recorrido rápido.
- Apariencia: tema, tamaño del texto y «Reducir animaciones».
- General: nombre, inicio de la semana, formato de hora, vista de calendario por defecto y pantalla de inicio.
- Gestión de etiquetas compartidas entre calendario, diario y tareas.
- «Acerca de» con versión, créditos y licencias.

### Temas y diseño

- Tres temas: Pink, White y Dark, más «Sistema», que sigue el modo claro u oscuro de Windows.
- El cambio de tema se aplica al instante y sin parpadeo al abrir la app.
- Tipografías incluidas en la app (Fraunces, Nunito y JetBrains Mono), sin descargas.
- Micro-animaciones suaves: casillas con corazones o destellos, fundidos entre pantallas y diálogos.
- Contraste revisado en los tres temas, foco visible y áreas de clic amplias.

### Atajos de teclado

- Atajos para navegar, crear y moverse por cada pantalla.
- Todos se pueden reasignar desde Ajustes, con detección de conflictos e intercambio.
- Hoja de atajos con las combinaciones actuales.

### Datos y copias de seguridad

- Base de datos SQLite local con migraciones versionadas.
- Exportar una copia completa a un archivo `.db`.
- Importar una copia con validación previa y una copia automática de los datos actuales antes de reemplazarlos.
- Borrar todos los datos con doble confirmación.

### Ventana e instalador

- Ventana sin bordes con barra de título propia que sigue el tema; recuerda su tamaño y posición.
- Barra lateral plegable.
- Pantalla de error amable que mantiene la ventana usable y permite copiar el detalle o reiniciar.
- Icono de lazo rosa.
- Instalador `.exe` por usuario, sin permisos de administrador, e instalador `.msi`. Si falta WebView2, el instalador lo descarga.
