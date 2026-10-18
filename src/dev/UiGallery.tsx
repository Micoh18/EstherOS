import { useState, type ReactNode } from "react";
import { MOODS, PALETTE_COLORS, THEMES, isThemeName, type ThemeName } from "@/shared/theme";
import {
  Bow,
  CalendarDays,
  Cloud,
  Heart,
  Moon,
  Palette,
  Plus,
  RibbonDivider,
  Search,
  Sparkle,
  StarSmall,
  Sun,
  X,
} from "@/shared/icons";
import {
  Button,
  Card,
  Checkbox,
  Chip,
  DatePicker,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  EmptyState,
  IconButton,
  Input,
  Kbd,
  MonthGrid,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
  Skeleton,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  TimePicker,
  ToastProvider,
  Tooltip,
  useToast,
  type ChipColor,
} from "@/shared/ui";

// Internal dev page (/dev/ui): every design system component in every state, per theme.

const THEME_LABELS: Record<ThemeName, string> = { pink: "Pink", white: "White", dark: "Dark" };
const SEMANTIC_TOKENS = [
  "bg",
  "bg-elevated",
  "surface",
  "surface-hover",
  "border",
  "text",
  "text-muted",
  "text-faint",
  "accent",
  "accent-hover",
  "accent-soft",
  "on-accent",
  "success",
  "warning",
  "danger",
];
const BACKGROUNDS = ["bg", "surface", "bg-elevated"] as const;
const LIST_OPTIONS = [
  { value: "inbox", label: "Inbox" },
  { value: "home", label: "Casa" },
  { value: "work", label: "Trabajo" },
  { value: "me", label: "Yo", disabled: true },
];
const CHIP_COLORS: ChipColor[] = [...PALETTE_COLORS, "accent", "neutral"];

function readTheme(): ThemeName {
  const current = document.documentElement.dataset.theme;
  return isThemeName(current) ? current : "pink";
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      {label ? <p className="text-xs font-semibold text-text-muted uppercase">{label}</p> : null}
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

function Swatch({ token }: { token: string }) {
  return (
    <div className="flex w-[112px] flex-col gap-1">
      <span
        className="h-[44px] rounded-md border border-border"
        style={{ background: `var(--${token})` }}
      />
      <code className="font-mono text-xs text-text-muted">--{token}</code>
    </div>
  );
}

function ColorStrips() {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {BACKGROUNDS.map((bg) => (
        <div
          key={bg}
          className="flex flex-col gap-3 rounded-lg border border-border p-4"
          style={{ background: `var(--${bg})` }}
        >
          <p className="text-sm font-semibold">
            sobre <code className="font-mono">--{bg}</code>
          </p>
          <p className="text-sm">
            Texto <span className="text-text-muted">secundario</span>{" "}
            <span className="text-text-faint">tenue</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {PALETTE_COLORS.map((color) => (
              <span
                key={color}
                title={color}
                className="size-[28px] rounded-full"
                style={{ background: `var(--palette-${color})` }}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {PALETTE_COLORS.map((color) => (
              <Chip key={color} color={color} size="sm">
                {color}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {MOODS.map((mood) => (
              <span key={mood} className="flex items-center gap-1 text-xs text-text-muted">
                <span
                  className="size-[14px] rounded-full"
                  style={{ background: `var(--mood-${mood})` }}
                />
                {mood}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ToastDemo() {
  const { toast } = useToast();
  return (
    <Row>
      <Button
        variant="soft"
        onClick={() => toast({ title: "Guardado ✓", description: "Tu entrada está a salvo." })}
      >
        Toast normal
      </Button>
      <Button
        variant="soft"
        onClick={() =>
          toast({
            variant: "success",
            title: "Evento movido",
            description: "Se movió toda la serie.",
            action: { label: "Deshacer", onClick: () => undefined },
          })
        }
      >
        Toast con acción
      </Button>
      <Button
        variant="danger"
        onClick={() =>
          toast({ variant: "danger", title: "No se pudo importar", description: "No es SQLite." })
        }
      >
        Toast de error
      </Button>
    </Row>
  );
}

function Gallery() {
  const [theme, setThemeState] = useState<ThemeName>(readTheme);
  const [checked, setChecked] = useState(true);
  const [switchOn, setSwitchOn] = useState(true);
  const [list, setList] = useState<string>("home");
  const [date, setDate] = useState<Date | null>(new Date());
  const [time, setTime] = useState<string | null>("09:30");
  const [tags, setTags] = useState(["casa", "flores", "domingo"]);
  const [filter, setFilter] = useState(false);

  const setTheme = (next: string) => {
    if (!isThemeName(next)) return;
    document.documentElement.dataset.theme = next;
    setThemeState(next);
  };

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-7 px-6 py-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Bow size={32} className="text-accent" />
          <div>
            <h1 className="text-3xl">Galería UI</h1>
            <p className="text-sm text-text-muted">Componentes de shared/ui en los tres themes</p>
          </div>
        </div>
        <Tabs value={theme} onValueChange={setTheme}>
          <TabsList aria-label="Theme">
            {THEMES.map((name) => (
              <TabsTrigger key={name} value={name}>
                {name === "dark" ? <Moon aria-hidden /> : <Sun aria-hidden />}
                {THEME_LABELS[name]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </header>

      <Section title="Colores">
        <div className="flex flex-wrap gap-3">
          {SEMANTIC_TOKENS.map((token) => (
            <Swatch key={token} token={token} />
          ))}
        </div>
        <ColorStrips />
      </Section>

      <RibbonDivider className="text-text-faint" />

      <Section title="Tipografía">
        <div className="flex flex-col gap-2">
          <p className="font-display text-3xl font-semibold">Sábado, 18 de octubre</p>
          <p className="font-display text-2xl">Buenos días, Esther ♡</p>
          <p className="font-display text-xl">Hoy en tu calendario</p>
          <p className="text-lg">Texto grande — Nunito 18</p>
          <p className="text-md">Texto medio — Nunito 16</p>
          <p className="text-base">
            Cuerpo base — Nunito 14. <strong>Negrita 700</strong>,{" "}
            <span className="font-semibold">semibold 600</span>.
          </p>
          <p className="text-sm text-text-muted">Secundario 13 — Hace 3 días</p>
          <p className="text-xs text-text-faint">Tenue 12 — placeholders y fechas pasadas</p>
          <p className="font-mono text-sm">09:00 10:00 11:00 · JetBrains Mono</p>
        </div>
      </Section>

      <Section title="Button / IconButton">
        {(["primary", "soft", "ghost", "danger"] as const).map((variant) => (
          <Row key={variant} label={variant}>
            <Button variant={variant} size="sm">
              Pequeño
            </Button>
            <Button variant={variant}>
              <Plus aria-hidden />
              Mediano
            </Button>
            <Button variant={variant} size="lg">
              Grande
            </Button>
            <Button variant={variant} disabled>
              Deshabilitado
            </Button>
          </Row>
        ))}
        <Row label="IconButton ghost / soft · sm / md">
          <IconButton label="Buscar" size="sm">
            <Search aria-hidden />
          </IconButton>
          <IconButton label="Buscar">
            <Search aria-hidden />
          </IconButton>
          <IconButton label="Añadir" variant="soft" size="sm">
            <Plus aria-hidden />
          </IconButton>
          <IconButton label="Añadir" variant="soft">
            <Plus aria-hidden />
          </IconButton>
          <IconButton label="Cerrar" disabled>
            <X aria-hidden />
          </IconButton>
        </Row>
      </Section>

      <Section title="Card">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <p className="font-display text-lg font-semibold">Card default</p>
            <p className="text-sm text-text-muted">Borde 1px, radius-lg y shadow-sm.</p>
          </Card>
          <Card variant="interactive" tabIndex={0}>
            <p className="font-display text-lg font-semibold">Card interactive</p>
            <p className="text-sm text-text-muted">Sube a shadow-md al pasar el ratón.</p>
          </Card>
          <Card padding="sm" tone="elevated">
            <p className="text-sm">tone elevated, padding sm</p>
          </Card>
        </div>
      </Section>

      <Section title="Input / Textarea">
        <div className="grid gap-3 md:grid-cols-2">
          <Input placeholder="Añadir una tarea…" aria-label="Normal" />
          <Input defaultValue="Comprar flores !alta @mañana" aria-label="Con valor" />
          <Input size="sm" placeholder="Pequeño" aria-label="Pequeño" />
          <Input placeholder="Deshabilitado" disabled aria-label="Deshabilitado" />
          <Input defaultValue="Valor no válido" aria-invalid aria-label="Inválido" />
          <Textarea placeholder="Notas…" aria-label="Notas" />
        </div>
      </Section>

      <Section title="Checkbox / Switch">
        <Row label="Checkbox">
          <label className="flex items-center gap-2">
            <Checkbox checked={checked} onCheckedChange={setChecked} />
            Controlado ({checked ? "hecha" : "pendiente"})
          </label>
          <label className="flex items-center gap-2">
            <Checkbox />
            Sin marcar
          </label>
          <label className="flex items-center gap-2">
            <Checkbox size="sm" defaultChecked />
            Pequeño
          </label>
          <label className="flex items-center gap-2">
            <Checkbox particles="sparkle" />
            Partículas estrella
          </label>
          <label className="flex items-center gap-2 text-text-muted">
            <Checkbox disabled />
            Deshabilitado
          </label>
          <label className="flex items-center gap-2 text-text-muted">
            <Checkbox disabled defaultChecked />
            Deshabilitado marcado
          </label>
        </Row>
        <Row label="Switch">
          <label className="flex items-center gap-2">
            <Switch checked={switchOn} onCheckedChange={setSwitchOn} />
            Reducir animaciones
          </label>
          <label className="flex items-center gap-2">
            <Switch />
            Apagado
          </label>
          <label className="flex items-center gap-2">
            <Switch size="sm" defaultChecked />
            Pequeño
          </label>
          <label className="flex items-center gap-2 text-text-muted">
            <Switch disabled />
            Deshabilitado
          </label>
        </Row>
      </Section>

      <Section title="Chip">
        <Row label="Colores · md">
          {CHIP_COLORS.map((color) => (
            <Chip key={color} color={color}>
              {color}
            </Chip>
          ))}
        </Row>
        <Row label="sm · con icono · seleccionable · eliminable">
          <Chip size="sm" color="rose">
            Hoy
          </Chip>
          <Chip color="lavender" icon={<CalendarDays aria-hidden />}>
            Vie 24
          </Chip>
          <Chip color="accent" selected={filter} onClick={() => setFilter((value) => !value)}>
            Solo favoritas
          </Chip>
          {tags.map((tag) => (
            <Chip
              key={tag}
              color="sage"
              onRemove={() => setTags((current) => current.filter((item) => item !== tag))}
            >
              {tag}
            </Chip>
          ))}
        </Row>
      </Section>

      <Section title="Tabs">
        <Tabs defaultValue="month">
          <TabsList aria-label="Vista del calendario">
            <TabsTrigger value="month">Mes</TabsTrigger>
            <TabsTrigger value="week">Semana</TabsTrigger>
            <TabsTrigger value="day">Día</TabsTrigger>
          </TabsList>
          <TabsContent value="month" className="text-sm text-text-muted">
            Contenido del mes
          </TabsContent>
          <TabsContent value="week" className="text-sm text-text-muted">
            Contenido de la semana
          </TabsContent>
          <TabsContent value="day" className="text-sm text-text-muted">
            Contenido del día
          </TabsContent>
        </Tabs>
        <Tabs defaultValue="b" size="sm">
          <TabsList aria-label="Pequeño">
            <TabsTrigger value="a">Hoy</TabsTrigger>
            <TabsTrigger value="b">Próximas</TabsTrigger>
            <TabsTrigger value="c">Vencidas</TabsTrigger>
            <TabsTrigger value="d" disabled>
              Todas
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </Section>

      <Section title="Select / DatePicker / TimePicker">
        <div className="grid gap-3 md:grid-cols-3">
          <Select options={LIST_OPTIONS} value={list} onValueChange={setList} aria-label="Lista" />
          <Select options={LIST_OPTIONS} aria-label="Sin valor" placeholder="Elige una lista" />
          <Select options={LIST_OPTIONS} disabled defaultValue="inbox" aria-label="Deshabilitado" />
          <DatePicker value={date} onChange={setDate} aria-label="Fecha" />
          <DatePicker value={null} onChange={() => undefined} aria-label="Sin fecha" />
          <TimePicker value={time} onChange={setTime} aria-label="Hora" />
          <TimePicker
            value="18:15"
            onChange={() => undefined}
            hourCycle={12}
            aria-label="Hora 12 h"
          />
          <TimePicker value={null} onChange={() => undefined} aria-label="Sin hora" />
          <Input size="sm" disabled value="Formato 24 h / 12 h" aria-label="Nota" readOnly />
        </div>
        <Row label="MonthGrid con marcas de mood">
          <Card padding="sm">
            <MonthGrid
              selected={date}
              onSelect={setDate}
              renderDay={(day) =>
                day.getDate() % 4 === 0 ? (
                  <span
                    className="size-[5px] rounded-full"
                    style={{ background: `var(--mood-${MOODS[day.getDate() % 5]})` }}
                  />
                ) : null
              }
            />
          </Card>
        </Row>
      </Section>

      <Section title="Dialog / Sheet / Popover / Tooltip">
        <Row>
          <Dialog>
            <DialogTrigger asChild>
              <Button>Abrir diálogo</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuevo evento</DialogTitle>
                <DialogDescription>Aparece con fade y escala .96 → 1.</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-3">
                <Input placeholder="Título" aria-label="Título" autoFocus />
                <div className="flex gap-3">
                  <DatePicker value={date} onChange={setDate} aria-label="Fecha del evento" />
                  <TimePicker value={time} onChange={setTime} aria-label="Hora del evento" />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="ghost">Cancelar</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button>Guardar</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="soft">Sheet derecha</Button>
            </SheetTrigger>
            <SheetContent>
              <SheetTitle>Detalle de tarea</SheetTitle>
              <SheetDescription>Panel lateral sobre el primitivo Dialog.</SheetDescription>
              <Textarea placeholder="Notas…" aria-label="Notas del panel" />
            </SheetContent>
          </Sheet>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="soft">Sheet izquierda</Button>
            </SheetTrigger>
            <SheetContent side="left">
              <SheetTitle>Filtros</SheetTitle>
              <SheetDescription>Desde la izquierda.</SheetDescription>
            </SheetContent>
          </Sheet>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost">
                <Palette aria-hidden />
                Popover
              </Button>
            </PopoverTrigger>
            <PopoverContent>
              <p className="mb-2 text-sm font-semibold">Color</p>
              <div className="flex gap-2">
                {PALETTE_COLORS.map((color) => (
                  <span
                    key={color}
                    className="size-[24px] rounded-full"
                    style={{ background: `var(--palette-${color})` }}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <Tooltip content="Ir a hoy" shortcut="T">
            <Button variant="ghost">Tooltip</Button>
          </Tooltip>
          <Tooltip content="Cambiar theme" shortcut="Ctrl+Shift+T" side="top">
            <IconButton label="Cambiar theme">
              <Palette aria-hidden />
            </IconButton>
          </Tooltip>
        </Row>
      </Section>

      <Section title="Toast">
        <ToastDemo />
      </Section>

      <Section title="Kbd / Skeleton">
        <Row label="Kbd">
          <Kbd combo="Ctrl+Shift+T" />
          <Kbd combo="Ctrl+/" />
          <Kbd combo="Ctrl++" />
          <Kbd keys={["G", "T"]} />
          <Kbd combo="Alt+↑" size="sm" />
        </Row>
        <div className="flex max-w-[420px] items-center gap-3">
          <Skeleton shape="circle" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton />
            <Skeleton className="w-2/3" />
          </div>
        </div>
        <Skeleton shape="block" className="max-w-[420px]" />
      </Section>

      <Section title="EmptyState">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <EmptyState
              title="Todo en orden por aquí ♡"
              description="Añade una tarea con Enter."
              action={<Button size="sm">Nueva tarea</Button>}
            />
          </Card>
          <Card>
            <EmptyState
              size="sm"
              icon={<Cloud size={22} />}
              title="Día despejado"
              description="¿Un poco de diario?"
            />
          </Card>
        </div>
      </Section>

      <Section title="Decorativos">
        <Row label="text-accent · 16 / 24 / 32">
          {[16, 24, 32].map((size) => (
            <span key={size} className="flex items-center gap-3 text-accent">
              <Bow size={size} />
              <Heart size={size} />
              <Heart size={size} filled />
              <Sparkle size={size} />
              <StarSmall size={size} />
              <Cloud size={size} />
            </span>
          ))}
        </Row>
        <Row label="text-text-faint">
          <span className="flex items-center gap-3 text-text-faint">
            <Bow />
            <Heart />
            <Sparkle />
            <StarSmall />
            <Cloud />
          </span>
        </Row>
        <RibbonDivider className="text-accent" />
        <RibbonDivider className="text-text-faint" size={16} />
      </Section>
    </div>
  );
}

export function UiGallery() {
  return (
    <ToastProvider>
      <div className="h-full overflow-y-auto bg-bg text-text">
        <Gallery />
      </div>
    </ToastProvider>
  );
}
