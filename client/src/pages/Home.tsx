import DashboardLayout from "@/components/DashboardLayout";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ListFilter,
  ListTodo,
  Plus,
  Settings2,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import "./day-view.css";

const BRAND_MARK = "/manus-storage/athenaeum-book-leaf-mark_77cfcc0c.png";
const DESK_TEXTURE = "/manus-storage/athenaeum-reading-room-texture_e7f1ab5b.jpg";
const STORAGE_KEY = "athenaeum-school-hub-v1";

type Category = "School" | "Personal" | "Activity" | "Other";
type Item = {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: number;
  category: Category;
  subject: string;
  priority: "Low" | "Normal" | "Important";
  reminder: "0" | "10" | "30" | "60";
  notes: string;
  done: boolean;
  googleEventId?: string;
};

type CalendarMode = "month" | "week" | "day" | "agenda";
type TaskFilter = "all" | "open" | "done";

const categoryStyles: Record<Category, { color: string; wash: string }> = {
  School: { color: "#A9782F", wash: "#F4E4C5" },
  Personal: { color: "#3E6B63", wash: "#DCEBE7" },
  Activity: { color: "#6B4C6E", wash: "#E9DDEA" },
  Other: { color: "#5D6671", wash: "#E3E7EA" },
};

export function dayKey(value = new Date()) {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function fromKey(value: string) {
  return new Date(`${value}T12:00:00`);
}

export function shiftDay(days: number, base = new Date()) {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return dayKey(next);
}

function formatDay(value: string, options: Intl.DateTimeFormatOptions = { weekday: "long", month: "long", day: "numeric" }) {
  return fromKey(value).toLocaleDateString("en-US", options);
}

export function formatTime(value: string) {
  if (!value) return "Any time";
  const [hour, minute] = value.split(":").map(Number);
  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function makeId() {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function createBlankItem(date: string): Item {
  return {
    id: makeId(),
    title: "",
    date,
    time: "",
    duration: 60,
    category: "School",
    subject: "",
    priority: "Normal",
    reminder: "10",
    notes: "",
    done: false,
  };
}

function loadItems() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved) as Item[]) : [];
  } catch {
    return [];
  }
}

function SortableItems({ items, onToggle, onEdit, empty }: { items: Item[]; onToggle: (id: string) => void; onEdit: (item: Item) => void; empty: string }) {
  const sorted = [...items].sort((a, b) => `${a.date}-${a.time}`.localeCompare(`${b.date}-${b.time}`));
  if (!sorted.length) return <div className="empty-note"><Sparkles size={18} /><span>{empty}</span></div>;
  return <div className="task-list">{sorted.map((item) => <TaskRow key={item.id} item={item} onToggle={onToggle} onEdit={onEdit} />)}</div>;
}

function TaskRow({ item, onToggle, onEdit }: { item: Item; onToggle: (id: string) => void; onEdit: (item: Item) => void }) {
  const category = categoryStyles[item.category];
  return <div className={`task-row-new ${item.done ? "complete" : ""}`}>
    <button className="check-circle" onClick={() => onToggle(item.id)} aria-label={`Mark ${item.title} ${item.done ? "incomplete" : "complete"}`}>{item.done && <Check size={13} />}</button>
    <button className="task-row-content" onClick={() => onEdit(item)}>
      <span className="task-row-title">{item.title}</span>
      <span className="task-row-meta"><span className="category-dot" style={{ background: category.color }} />{item.subject || item.category} · {formatDay(item.date, { month: "short", day: "numeric" })}{item.time ? ` · ${formatTime(item.time)}` : ""}</span>
    </button>
    <span className={`priority-marker ${item.priority.toLowerCase()}`} aria-label={`${item.priority} priority`} />
  </div>;
}

function QuickAddModal({ initialDate, item, onSave, onClose }: { initialDate: string; item?: Item; onSave: (item: Item) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<Item>(item ?? createBlankItem(initialDate));
  const update = <K extends keyof Item>(key: K, value: Item[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.title.trim()) return;
    onSave({ ...draft, title: draft.title.trim() });
  };
  return <div className="hub-modal-backdrop" role="presentation"><motion.form className="hub-modal" onSubmit={submit} initial={{ opacity: 0, y: 10, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 7, scale: .98 }} transition={{ duration: .2, ease: [0.23, 1, 0.32, 1] }}>
    <div className="modal-head"><div><span className="eyebrow">{item ? "Edit item" : "New item"}</span><h2>{item ? "Update the plan" : "Put it on the board"}</h2></div><button type="button" className="round-icon" onClick={onClose} aria-label="Close"><X size={17} /></button></div>
    <label className="field-label">What do you need to do?<input autoFocus className="hub-field title" value={draft.title} onChange={(event) => update("title", event.target.value)} placeholder="e.g. Finish biology lab write-up" /></label>
    <div className="two-fields"><label className="field-label">Date<input className="hub-field" type="date" value={draft.date} onChange={(event) => update("date", event.target.value)} /></label><label className="field-label">Start time<input className="hub-field" type="time" value={draft.time} onChange={(event) => update("time", event.target.value)} /></label></div>
    <label className="field-label">Class or subject <span>(optional)</span><input className="hub-field" value={draft.subject} onChange={(event) => update("subject", event.target.value)} placeholder="e.g. Biology, English, Basketball" /></label>
    <div className="three-fields"><label className="field-label">Category<select className="hub-field" value={draft.category} onChange={(event) => update("category", event.target.value as Category)}>{Object.keys(categoryStyles).map((category) => <option key={category}>{category}</option>)}</select></label><label className="field-label">Priority<select className="hub-field" value={draft.priority} onChange={(event) => update("priority", event.target.value as Item["priority"])}><option>Low</option><option>Normal</option><option>Important</option></select></label><label className="field-label">Reminder<select className="hub-field" value={draft.reminder} onChange={(event) => update("reminder", event.target.value as Item["reminder"])}><option value="0">None</option><option value="10">10 min</option><option value="30">30 min</option><option value="60">1 hour</option></select></label></div>
    <label className="field-label">Notes <span>(optional)</span><textarea className="hub-field hub-notes" value={draft.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Anything you need to remember?" /></label>
    <div className="google-note"><CalendarDays size={15} /><span>Google Calendar will be added automatically after your account is connected.</span></div>
    <div className="modal-actions"><button type="button" className="text-button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit"><Plus size={15} /> {item ? "Save changes" : "Add item"}</button></div>
  </motion.form></div>;
}

function MonthCalendar({ anchor, selectedDate, items, onSelectDate, onChangeMonth, onAdd }: { anchor: Date; selectedDate: string; items: Item[]; onSelectDate: (date: string) => void; onChangeMonth: (change: number) => void; onAdd: (date: string) => void }) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const daysInMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
  const leading = first.getDay();
  const cells: Array<string | null> = Array.from({ length: 42 }, (_, index) => index >= leading && index < leading + daysInMonth ? dayKey(new Date(anchor.getFullYear(), anchor.getMonth(), index - leading + 1)) : null);
  const itemsFor = (date: string) => items.filter((item) => item.date === date).sort((a, b) => a.time.localeCompare(b.time));
  return <section className="calendar-paper"><div className="calendar-toolbar"><div><span className="eyebrow">School calendar</span><h2>{first.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h2></div><div className="calendar-actions"><button className="today-button" onClick={() => { onChangeMonth(0); onSelectDate(dayKey()); }}>Today</button><button className="round-icon" onClick={() => onChangeMonth(-1)} aria-label="Previous month"><ChevronLeft size={17} /></button><button className="round-icon" onClick={() => onChangeMonth(1)} aria-label="Next month"><ChevronRight size={17} /></button></div></div><div className="month-weekdays">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => <span key={label}>{label}</span>)}</div><div className="month-grid">{cells.map((date, index) => {
    if (!date) return <div className="blank-cell" key={`blank-${index}`} />;
    const dayItems = itemsFor(date);
    const today = date === dayKey();
    return <button key={date} onClick={() => onSelectDate(date)} className={`month-cell ${selectedDate === date ? "selected" : ""} ${today ? "today" : ""}`}><span className="cell-day-number">{fromKey(date).getDate()}</span><div className="cell-items">{dayItems.slice(0, 3).map((item) => <span className="calendar-chip" key={item.id} style={{ background: categoryStyles[item.category].wash, color: categoryStyles[item.category].color }}><i style={{ background: categoryStyles[item.category].color }} />{item.time && `${formatTime(item.time)} · `}{item.title}</span>)}{dayItems.length > 3 && <span className="more-items">+{dayItems.length - 3} more</span>}</div><span className="add-on-day" onClick={(event) => { event.stopPropagation(); onAdd(date); }} aria-label={`Add item on ${date}`}><Plus size={12} /></span></button>;
  })}</div></section>;
}

function WeekCalendar({ selectedDate, items, onSelectDate, onAdd }: { selectedDate: string; items: Item[]; onSelectDate: (date: string) => void; onAdd: (date: string) => void }) {
  const selected = fromKey(selectedDate);
  const start = new Date(selected);
  start.setDate(selected.getDate() - selected.getDay());
  const days = Array.from({ length: 7 }, (_, index) => shiftDay(index, start));
  return <section className="week-paper"><div className="week-grid">{days.map((date) => <div className={`week-day ${date === selectedDate ? "selected" : ""}`} key={date}><button className="week-day-head" onClick={() => onSelectDate(date)}><span>{fromKey(date).toLocaleDateString("en-US", { weekday: "short" })}</span><strong>{fromKey(date).getDate()}</strong></button><div className="week-events">{items.filter((item) => item.date === date).sort((a, b) => a.time.localeCompare(b.time)).map((item) => <div className="week-event" key={item.id} style={{ borderLeftColor: categoryStyles[item.category].color }}><span>{item.time ? formatTime(item.time) : "Any time"}{item.subject ? ` · ${item.subject}` : ""}</span>{item.title}</div>)}</div><button className="week-add" onClick={() => onAdd(date)}><Plus size={14} /> Add</button></div>)}</div></section>;
}

function DayView({ selectedDate, items, onToggle, onEdit, onAdd }: { selectedDate: string; items: Item[]; onToggle: (id: string) => void; onEdit: (item: Item) => void; onAdd: (date: string) => void }) {
  const planned = items.filter((item) => item.date === selectedDate).sort((a, b) => a.time.localeCompare(b.time));
  return <section className="day-paper"><div className="day-view-head"><div><span className="eyebrow">Daily plan</span><h2>{formatDay(selectedDate)}</h2></div><button className="primary-button" onClick={() => onAdd(selectedDate)}><Plus size={15} /> Add to day</button></div><div className="day-view-rule" /><SortableItems items={planned} onToggle={onToggle} onEdit={onEdit} empty="Nothing is planned here yet. Add the first thing that needs your time." /></section>;
}

function Agenda({ items, onToggle, onEdit }: { items: Item[]; onToggle: (id: string) => void; onEdit: (item: Item) => void }) {
  const upcoming = items.filter((item) => item.date >= dayKey()).sort((a, b) => `${a.date}-${a.time}`.localeCompare(`${b.date}-${b.time}`));
  const groups = upcoming.reduce<Record<string, Item[]>>((result, item) => ({ ...result, [item.date]: [...(result[item.date] ?? []), item] }), {});
  return <section className="agenda-paper">{Object.keys(groups).length ? Object.entries(groups).map(([date, group]) => <div className="agenda-group" key={date}><div className="agenda-date"><span>{formatDay(date, { weekday: "short" })}</span><strong>{fromKey(date).getDate()}</strong><small>{formatDay(date, { month: "long" }).replace(/^\w+\s/, "")}</small></div><SortableItems items={group} onToggle={onToggle} onEdit={onEdit} empty="" /></div>) : <div className="empty-note"><CalendarDays size={18} /><span>Your upcoming calendar is clear.</span></div>}</section>;
}

function TodayView({ items, onToggle, onEdit, onAdd, setLocation }: { items: Item[]; onToggle: (id: string) => void; onEdit: (item: Item) => void; onAdd: () => void; setLocation: (path: string) => void }) {
  const today = dayKey();
  const todayItems = items.filter((item) => item.date === today);
  const upcoming = items.filter((item) => item.date > today && !item.done).sort((a, b) => `${a.date}-${a.time}`.localeCompare(`${b.date}-${b.time}`)).slice(0, 4);
  const finished = todayItems.filter((item) => item.done).length;
  return <div className="hub-grid"><section className="day-hero" style={{ backgroundImage: `linear-gradient(90deg, rgba(251,247,238,.96) 0%, rgba(251,247,238,.8) 47%, rgba(251,247,238,.22) 100%), url(${DESK_TEXTURE})` }}><div className="hero-copy"><span className="eyebrow">Your school hub</span><h1>Keep today <em>clear.</em></h1><p>{todayItems.length ? `${todayItems.filter((item) => !item.done).length} item${todayItems.filter((item) => !item.done).length === 1 ? "" : "s"} remain on today’s board.` : "Your board is open. Add the first thing you need to remember."}</p><button className="primary-button" onClick={onAdd}><Plus size={15} /> Quick add</button></div></section><section className="metric-rack"><div className="metric-tile"><ListTodo size={17} /><strong>{todayItems.length}</strong><span>planned today</span></div><div className="metric-tile"><CheckCircle2 size={17} /><strong>{finished}</strong><span>finished today</span></div><button className="metric-tile link-tile" onClick={() => setLocation("/calendar")}><CalendarDays size={17} /><strong>Plan</strong><span>open calendar</span></button></section><section className="hub-card today-card"><div className="card-head"><div><span className="eyebrow">Today · {formatDay(today, { weekday: "long", month: "short", day: "numeric" })}</span><h2>What matters now</h2></div><button className="simple-link" onClick={() => setLocation("/tasks")}>All tasks <ChevronRight size={15} /></button></div><SortableItems items={todayItems} onToggle={onToggle} onEdit={onEdit} empty="Nothing is scheduled today. Give yourself a little breathing room—or add what is next." /></section><section className="hub-card upcoming-card"><div className="card-head"><div><span className="eyebrow">Up next</span><h2>On the horizon</h2></div><button className="round-icon" onClick={() => setLocation("/calendar")} aria-label="Open calendar"><CalendarDays size={16} /></button></div><SortableItems items={upcoming} onToggle={onToggle} onEdit={onEdit} empty="Future plans will gather here." /></section></div>;
}

function CalendarView({ items, selectedDate, setSelectedDate, onToggle, onEdit, onAdd }: { items: Item[]; selectedDate: string; setSelectedDate: (date: string) => void; onToggle: (id: string) => void; onEdit: (item: Item) => void; onAdd: (date?: string) => void }) {
  const [mode, setMode] = useState<CalendarMode>("month");
  const [anchor, setAnchor] = useState(() => fromKey(selectedDate));
  const dayItems = items.filter((item) => item.date === selectedDate);
  const changeMonth = (change: number) => { if (!change) { setAnchor(fromKey(dayKey())); return; } setAnchor((current) => new Date(current.getFullYear(), current.getMonth() + change, 1)); };
  const select = (date: string) => { setSelectedDate(date); setAnchor(fromKey(date)); };
  return <div className="calendar-layout"><section className="calendar-main"><div className="view-bar"><div className="view-tabs">{(["month", "week", "day", "agenda"] as CalendarMode[]).map((option) => <button key={option} className={mode === option ? "active" : ""} onClick={() => setMode(option)}>{option}</button>)}</div><button className="primary-button" onClick={() => onAdd(selectedDate)}><Plus size={15} /> New item</button></div>{mode === "month" && <MonthCalendar anchor={anchor} selectedDate={selectedDate} items={items} onSelectDate={select} onChangeMonth={changeMonth} onAdd={onAdd} />}{mode === "week" && <WeekCalendar selectedDate={selectedDate} items={items} onSelectDate={select} onAdd={onAdd} />}{mode === "day" && <DayView selectedDate={selectedDate} items={items} onToggle={onToggle} onEdit={onEdit} onAdd={onAdd} />}{mode === "agenda" && <Agenda items={items} onToggle={onToggle} onEdit={onEdit} />}</section><aside className="hub-card selected-day-card"><span className="eyebrow">Selected day</span><h2>{formatDay(selectedDate)}</h2><button className="day-add" onClick={() => onAdd(selectedDate)}><Plus size={14} /> Add something</button><SortableItems items={dayItems} onToggle={onToggle} onEdit={onEdit} empty="Nothing here yet. Use this space for anything you need to remember." /></aside></div>;
}

function TasksView({ items, onToggle, onEdit, onAdd }: { items: Item[]; onToggle: (id: string) => void; onEdit: (item: Item) => void; onAdd: () => void }) {
  const [filter, setFilter] = useState<TaskFilter>("open");
  const filtered = items.filter((item) => filter === "all" || filter === "done" ? (filter === "all" ? true : item.done) : !item.done);
  return <section className="task-board"><div className="board-head"><div><span className="eyebrow">Task tracker</span><h1>Everything you need to do.</h1><p>Capture it once, then let the calendar show you when it matters.</p></div><button className="primary-button" onClick={onAdd}><Plus size={15} /> Add task</button></div><div className="filter-row"><ListFilter size={16} />{(["open", "all", "done"] as TaskFilter[]).map((option) => <button className={filter === option ? "active" : ""} onClick={() => setFilter(option)} key={option}>{option === "open" ? "To do" : option === "done" ? "Completed" : "All"}</button>)}</div><div className="hub-card task-board-list"><SortableItems items={filtered} onToggle={onToggle} onEdit={onEdit} empty={filter === "done" ? "Nothing is checked off yet—your wins will collect here." : "Your list is clear. Add something before it leaves your mind."} /></div></section>;
}

function SettingsView({ itemCount }: { itemCount: number }) {
  return <div className="settings-page"><div className="board-head"><div><span className="eyebrow">Hub settings</span><h1>Simple by default.</h1><p>Only the few details that make the rest of your school week easier.</p></div></div><section className="hub-card google-card"><div className="google-icon"><CalendarDays size={22} /></div><div><span className="eyebrow">Google Calendar</span><h2>Phone alerts, handled where you already see them.</h2><p>When the Google connection is activated, every scheduled Athenaeum item will be created in your Google Calendar with the reminder you select.</p><span className="connection-pending"><i /> Awaiting Google authorization</span></div></section><section className="hub-card setting-details"><div><span className="eyebrow">Your board</span><h2>{itemCount} saved item{itemCount === 1 ? "" : "s"}</h2></div><p>Tasks are currently saved to this browser. After Google Calendar authorization, scheduled items will also receive a linked Google Calendar event.</p></section></div>;
}

export default function Home() {
  const [location, setLocation] = useLocation();
  const [items, setItems] = useState<Item[]>(loadItems);
  const [selectedDate, setSelectedDate] = useState(dayKey());
  const [editing, setEditing] = useState<Item | undefined>();
  const [isAdding, setIsAdding] = useState(false);
  const [toast, setToast] = useState("");
  const openAdd = (date = selectedDate) => { setEditing(createBlankItem(date)); setIsAdding(true); };
  const active = location === "/calendar" ? "calendar" : location === "/tasks" ? "tasks" : location === "/settings" ? "settings" : "today";

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }, [items]);
  const notify = (text: string) => { setToast(text); window.setTimeout(() => setToast(""), 2600); };
  const save = (item: Item) => { setItems((current) => current.some((entry) => entry.id === item.id) ? current.map((entry) => entry.id === item.id ? item : entry) : [...current, item]); setSelectedDate(item.date); setIsAdding(false); setEditing(undefined); notify(item.googleEventId ? "Item updated." : "Saved to your Athenaeum board. Google sync is ready for authorization."); };
  const toggle = (id: string) => setItems((current) => current.map((item) => item.id === id ? { ...item, done: !item.done } : item));
  const edit = (item: Item) => { setEditing(item); setIsAdding(true); };

  return <DashboardLayout allowGuest><div className="school-shell"><header className="school-topbar"><div className="brand-inline"><img src={BRAND_MARK} alt="" /><div><strong>Athenaeum</strong><span>School hub</span></div></div><div className="top-actions"><button className="icon-top" onClick={() => setLocation("/settings")} aria-label="Hub settings"><Settings2 size={18} /></button><button className="primary-button compact" onClick={() => openAdd()}><Plus size={15} /> Add</button></div></header><nav className="mobile-hub-nav"><button onClick={() => setLocation("/")} className={active === "today" ? "active" : ""}>Today</button><button onClick={() => setLocation("/calendar")} className={active === "calendar" ? "active" : ""}>Calendar</button><button onClick={() => setLocation("/tasks")} className={active === "tasks" ? "active" : ""}>Tasks</button></nav>{active === "today" && <TodayView items={items} onToggle={toggle} onEdit={edit} onAdd={() => openAdd()} setLocation={setLocation} />}{active === "calendar" && <CalendarView items={items} selectedDate={selectedDate} setSelectedDate={setSelectedDate} onToggle={toggle} onEdit={edit} onAdd={openAdd} />}{active === "tasks" && <TasksView items={items} onToggle={toggle} onEdit={edit} onAdd={() => openAdd()} />}{active === "settings" && <SettingsView itemCount={items.length} />}</div><AnimatePresence>{isAdding && editing && <QuickAddModal initialDate={selectedDate} item={editing.title ? editing : undefined} onSave={save} onClose={() => { setIsAdding(false); setEditing(undefined); }} />}</AnimatePresence>{toast && <div className="hub-toast"><CheckCircle2 size={16} />{toast}</div>}</DashboardLayout>;
}
