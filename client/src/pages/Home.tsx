/**
 * Athenaeum UI — Sunlit Scholar: parchment surfaces, editorial type, quiet ink accents,
 * and tactile study traces. Every feature below writes into one local study record.
 */
import { AnimatePresence, motion } from "framer-motion";
import {
  Atom,
  BarChart3,
  BookOpen,
  Brain,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock3,
  Flame,
  GraduationCap,
  History,
  Languages,
  LayoutDashboard,
  Leaf,
  LibraryBig,
  Pause,
  Play,
  Plus,
  RotateCcw,
  ScrollText,
  Sigma,
  Sparkles,
  Target,
  Trophy,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const BRAND_MARK = "/manus-storage/athenaeum-book-leaf-mark_77cfcc0c.png";
const READING_ROOM = "/manus-storage/athenaeum-reading-room-texture_e7f1ab5b.jpg";
const PAPER_TEXTURE = "/manus-storage/athenaeum-botanical-paper-texture_6017d713.jpg";

const STORAGE_KEY = "athenaeum-study-ledger-v2";

type SubjectKey = "history" | "math" | "bio" | "tok" | "physics" | "english" | "french";
type TabKey = "dashboard" | "planner" | "focus" | "courses" | "recall" | "bank";
type LogKind = "focus" | "task" | "course" | "recall" | "question";

type Subject = {
  name: string;
  short: string;
  color: string;
  wash: string;
  exam: "IB" | "AP";
  icon: LucideIcon;
  topics: string[];
};

type StudyTask = { id: string; title: string; subject: SubjectKey; date: string; done: boolean };
type StudyLog = {
  id: string;
  subject: SubjectKey;
  date: string;
  timestamp: string;
  title: string;
  kind: LogKind;
  minutes: number;
  xp: number;
  sourceId?: string;
};
type Topic = { id: string; name: string; done: boolean };
type Flashcard = {
  id: string;
  subject: SubjectKey;
  front: string;
  back: string;
  box: number;
  dueDate: string;
  lastReviewed?: string;
};
type Question = { id: string; subject: SubjectKey; topic: string; earned: number; total: number; date: string };
type AppData = {
  tasks: StudyTask[];
  logs: StudyLog[];
  syllabus: Record<SubjectKey, Topic[]>;
  subjectTotals: Record<SubjectKey, number>;
  flashcards: Flashcard[];
  questions: Question[];
  gamification: { xp: number; streak: number; lastStudyDate: string };
  settings: { workMin: number; breakMin: number };
};

const SUBJECTS: Record<SubjectKey, Subject> = {
  history: {
    name: "IB History HL",
    short: "History",
    color: "#A9782F",
    wash: "#F4E5C7",
    exam: "IB",
    icon: ScrollText,
    topics: ["Paper 1 Prescribed Subject", "Paper 2 Topics", "Paper 3 HL Options", "History IA", "Source Analysis Logs", "Essay Drafts"],
  },
  math: {
    name: "IB Math AA HL / Calc BC",
    short: "Math",
    color: "#3B5A73",
    wash: "#DCE7EF",
    exam: "AP",
    icon: Sigma,
    topics: ["Limits", "Derivatives", "Integrals", "Series", "Questionbank Log", "Exploration IA"],
  },
  bio: {
    name: "IB Biology SL",
    short: "Biology",
    color: "#445540",
    wash: "#DEE7D9",
    exam: "IB",
    icon: Leaf,
    topics: ["Cell Biology", "Molecular Biology", "Genetics", "Ecology", "Evolution", "Human Physiology"],
  },
  tok: {
    name: "Theory of Knowledge",
    short: "TOK",
    color: "#6B4C6E",
    wash: "#E9DDEA",
    exam: "IB",
    icon: Brain,
    topics: ["Exhibition — Object 1", "Exhibition — Object 2", "Exhibition — Object 3", "TOK Essay Draft", "Prompt Journal"],
  },
  physics: {
    name: "AP Physics 1",
    short: "Physics",
    color: "#8B3A3A",
    wash: "#F0DCDC",
    exam: "AP",
    icon: Atom,
    topics: ["Kinematics", "Dynamics", "Energy", "Momentum", "Rotational Motion", "AP FRQ Logs"],
  },
  english: {
    name: "IB English HL",
    short: "English",
    color: "#3E6B63",
    wash: "#DCEBE7",
    exam: "IB",
    icon: BookOpen,
    topics: ["HL Essay", "Individual Oral Prep", "Literary Text Logs", "Paper 1 Practice", "Paper 2 Comparative Notes"],
  },
  french: {
    name: "IB French HL",
    short: "French",
    color: "#A65A6B",
    wash: "#F4DFE5",
    exam: "IB",
    icon: Languages,
    topics: ["Oral Exam Prep", "Listening Logs", "Reading Logs", "Vocabulary Recall Banks", "Grammar Structures"],
  },
};

const SUBJECT_KEYS = Object.keys(SUBJECTS) as SubjectKey[];
const LOG_KINDS: Record<LogKind, string> = {
  focus: "Focus session",
  task: "Completed",
  course: "Course progress",
  recall: "Recall review",
  question: "Question logged",
};
const HEAT_COLORS = ["#F0E8D8", "#E8D4AC", "#D8B16A", "#A9782F", "#66491E"];

function makeId(prefix = "entry") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function dayKey(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function shiftDay(days: number, from = new Date()) {
  const next = new Date(from);
  next.setDate(next.getDate() + days);
  return dayKey(next);
}

function fromKey(value: string) {
  return new Date(`${value}T12:00:00`);
}

function dateName(value: string, short = false) {
  return fromKey(value).toLocaleDateString("en-US", {
    weekday: short ? "short" : "long",
    month: "short",
    day: "numeric",
  });
}

function compactTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function getMinutes(logs: StudyLog[], date: string) {
  return logs.filter((entry) => entry.date === date).reduce((sum, entry) => sum + entry.minutes, 0);
}

function heatLevel(minutes: number) {
  if (minutes === 0) return 0;
  if (minutes < 20) return 1;
  if (minutes < 45) return 2;
  if (minutes < 80) return 3;
  return 4;
}

function updateStreak(gamification: AppData["gamification"], date: string) {
  if (gamification.lastStudyDate === date) return gamification;
  const yesterday = shiftDay(-1);
  return {
    ...gamification,
    lastStudyDate: date,
    streak: gamification.lastStudyDate === yesterday ? gamification.streak + 1 : 1,
  };
}

function makeDefaultData(): AppData {
  const today = dayKey();
  const syllabus = {} as Record<SubjectKey, Topic[]>;
  const subjectTotals = {} as Record<SubjectKey, number>;
  SUBJECT_KEYS.forEach((subject, subjectIndex) => {
    syllabus[subject] = SUBJECTS[subject].topics.map((name, index) => ({
      id: `${subject}-${index}`,
      name,
      done: index < [2, 3, 3, 1, 2, 1, 2][subjectIndex],
    }));
    subjectTotals[subject] = 0;
  });

  const trace = [0, 25, 0, 50, 15, 35, 0, 60, 25, 0, 40, 20, 0, 45, 75, 0, 30, 55, 25, 0, 65, 20, 35, 0, 50, 80, 25, 0, 45, 60];
  const logs: StudyLog[] = [];
  trace.forEach((minutes, index) => {
    if (!minutes) return;
    const subject = SUBJECT_KEYS[index % SUBJECT_KEYS.length];
    const date = shiftDay(index - trace.length + 1);
    subjectTotals[subject] += minutes;
    logs.push({
      id: `seed-focus-${index}`,
      subject,
      date,
      timestamp: new Date(`${date}T${String(15 + (index % 4)).padStart(2, "0")}:10:00`).toISOString(),
      title: `Focus Session: ${SUBJECTS[subject].short} — ${minutes}m`,
      kind: "focus",
      minutes,
      xp: minutes,
    });
  });

  logs.push(
    {
      id: "seed-complete-1",
      subject: "math",
      date: today,
      timestamp: new Date().toISOString(),
      title: "Completed: Calc BC Problem Set",
      kind: "task",
      minutes: 0,
      xp: 5,
      sourceId: "task-math",
    },
    {
      id: "seed-recall-1",
      subject: "french",
      date: today,
      timestamp: new Date(Date.now() - 3_600_000).toISOString(),
      title: "Recall review: French travel vocabulary",
      kind: "recall",
      minutes: 0,
      xp: 5,
    },
  );

  return {
    tasks: [
      { id: "task-french", title: "French vocab — 15m", subject: "french", date: today, done: false },
      { id: "task-math", title: "Calc BC Problem Set", subject: "math", date: today, done: true },
      { id: "task-history", title: "History Source Analysis, Ch. 4", subject: "history", date: today, done: false },
      { id: "task-physics", title: "AP Physics FRQ Set 2", subject: "physics", date: today, done: false },
      { id: "task-bio", title: "Bio Anki Review", subject: "bio", date: shiftDay(-1), done: true },
    ],
    logs,
    syllabus,
    subjectTotals,
    flashcards: [
      { id: "f1", subject: "french", front: "Comment dit-on ‘to take advantage of’ en français ?", back: "Profiter de", box: 2, dueDate: today },
      { id: "f2", subject: "bio", front: "What is the role of DNA polymerase?", back: "It adds complementary nucleotides to a growing DNA strand during replication.", box: 1, dueDate: today },
      { id: "f3", subject: "history", front: "What makes a source’s origin significant?", back: "Its author, time, place, and purpose shape what it can reliably reveal.", box: 3, dueDate: today },
      { id: "f4", subject: "french", front: "Lequel est correct: ‘depuis deux ans’ implies what tense?", back: "The present tense, because the action began in the past and continues now.", box: 2, dueDate: shiftDay(1) },
      { id: "f5", subject: "bio", front: "Where does the Krebs cycle occur in eukaryotic cells?", back: "In the mitochondrial matrix.", box: 1, dueDate: today },
      { id: "f6", subject: "history", front: "Define historical perspective.", back: "Understanding beliefs and actions within the context and values of the time.", box: 2, dueDate: shiftDay(2) },
    ],
    questions: [
      { id: "q1", subject: "math", topic: "Related Rates", earned: 6, total: 8, date: shiftDay(-1) },
      { id: "q2", subject: "physics", topic: "Rotational Motion FRQ", earned: 8, total: 10, date: shiftDay(-1) },
      { id: "q3", subject: "history", topic: "Paper 1 Source Skills", earned: 5, total: 7, date: shiftDay(-2) },
      { id: "q4", subject: "bio", topic: "Genetics short response", earned: 14, total: 20, date: shiftDay(-4) },
    ],
    gamification: { xp: 425, streak: 4, lastStudyDate: today },
    settings: { workMin: 25, breakMin: 5 },
  };
}

function hydrateData(raw: unknown): AppData {
  const fallback = makeDefaultData();
  if (!raw || typeof raw !== "object") return fallback;
  const candidate = raw as Partial<AppData> & { timerLogs?: Array<{ id: string; subject: SubjectKey; minutes: number; date: string }> };
  if (Array.isArray(candidate.logs)) {
    return {
      ...fallback,
      ...candidate,
      subjectTotals: candidate.subjectTotals ?? fallback.subjectTotals,
      flashcards: candidate.flashcards ?? fallback.flashcards,
      logs: candidate.logs,
    };
  }
  if (Array.isArray(candidate.timerLogs)) {
    const importedLogs: StudyLog[] = candidate.timerLogs.map((entry) => ({
      id: entry.id,
      subject: entry.subject,
      date: entry.date,
      timestamp: `${entry.date}T16:00:00.000Z`,
      title: `Focus Session: ${SUBJECTS[entry.subject]?.short ?? "Study"} — ${entry.minutes}m`,
      kind: "focus",
      minutes: entry.minutes,
      xp: entry.minutes,
    }));
    const totals = { ...fallback.subjectTotals };
    importedLogs.forEach((entry) => { totals[entry.subject] = (totals[entry.subject] ?? 0) + entry.minutes; });
    return { ...fallback, ...candidate, logs: importedLogs, subjectTotals: totals, flashcards: fallback.flashcards };
  }
  return fallback;
}

function addActivity(data: AppData, activity: Omit<StudyLog, "id" | "timestamp"> & { id?: string; timestamp?: string; countsForStreak?: boolean }) {
  const { countsForStreak = false, ...entryData } = activity;
  const entry: StudyLog = {
    ...entryData,
    id: entryData.id ?? makeId("log"),
    timestamp: entryData.timestamp ?? new Date().toISOString(),
  };
  const totals = { ...data.subjectTotals, [entry.subject]: (data.subjectTotals[entry.subject] ?? 0) + entry.minutes };
  const gamification = countsForStreak
    ? { ...updateStreak(data.gamification, entry.date), xp: data.gamification.xp + entry.xp }
    : { ...data.gamification, xp: data.gamification.xp + entry.xp };
  return { ...data, logs: [...data.logs, entry], subjectTotals: totals, gamification };
}

function subjectProgress(data: AppData, subject: SubjectKey) {
  const topics = data.syllabus[subject] ?? [];
  return topics.length ? Math.round((topics.filter((topic) => topic.done).length / topics.length) * 100) : 0;
}

function predictor(subject: SubjectKey, questions: Question[]) {
  const relevant = questions.filter((question) => question.subject === subject);
  if (!relevant.length) return null;
  const earned = relevant.reduce((sum, question) => sum + question.earned, 0);
  const total = relevant.reduce((sum, question) => sum + question.total, 0);
  const percent = total ? Math.round((earned / total) * 100) : 0;
  const isIb = SUBJECTS[subject].exam === "IB";
  const score = isIb
    ? percent >= 80 ? 7 : percent >= 70 ? 6 : percent >= 60 ? 5 : percent >= 50 ? 4 : percent >= 40 ? 3 : percent >= 30 ? 2 : 1
    : percent >= 85 ? 5 : percent >= 70 ? 4 : percent >= 55 ? 3 : percent >= 40 ? 2 : 1;
  return { percent, score, count: relevant.length, exam: isIb ? "IB" : "AP" };
}

function Surface({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <section className={`paper-panel ${className}`} style={style}><span className="folio-mark" aria-hidden="true" />{children}</section>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="ink-label">{children}</div>;
}

function SubjectDot({ subject }: { subject: SubjectKey }) {
  return <span className="subject-dot" style={{ backgroundColor: SUBJECTS[subject].color }} />;
}

function ProgressRing({ percent, color, size = 54 }: { percent: number; color: string; size?: number }) {
  const radius = (size - 7) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={`${percent}% complete`}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E8E0D0" strokeWidth="5" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference - (percent / 100) * circumference}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="progress-arc"
      />
      <text x="50%" y="53%" textAnchor="middle" fontSize="11" fontFamily="IBM Plex Mono, monospace" fill="#2B2620">{percent}%</text>
    </svg>
  );
}

function CalendarHeatmap({
  data,
  selectedDate,
  onSelect,
  className = "",
}: {
  data: AppData;
  selectedDate: string;
  onSelect: (date: string) => void;
  className?: string;
}) {
  const [cursor, setCursor] = useState(() => fromKey(selectedDate));
  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const monthName = monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const leading = monthStart.getDay();
  const days = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: leading + days }, (_, index) => {
    if (index < leading) return null;
    return dayKey(new Date(cursor.getFullYear(), cursor.getMonth(), index - leading + 1));
  });
  const visibleRows = Math.ceil(cells.length / 7);
  const padded = [...cells, ...Array.from({ length: visibleRows * 7 - cells.length }, () => null)];
  const previous = () => setCursor((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1));
  const next = () => setCursor((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1));

  return (
    <div className={`calendar-heatmap ${className}`}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <div className="font-display text-xl">{monthName}</div>
          <div className="text-xs mt-0.5 text-[#8A7F68]">A warmer square means more focused minutes.</div>
        </div>
        <div className="flex gap-1.5">
          <button className="icon-button" onClick={previous} aria-label="Previous month"><ChevronLeft size={16} /></button>
          <button className="icon-button" onClick={next} aria-label="Next month"><ChevronRight size={16} /></button>
        </div>
      </div>
      <div className="calendar-weekdays">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}</div>
      <div className="calendar-grid">
        {padded.map((date, index) => {
          if (!date) return <div key={`blank-${index}`} className="calendar-blank" />;
          const minutes = getMinutes(data.logs, date);
          const level = heatLevel(minutes);
          const isSelected = date === selectedDate;
          const isToday = date === dayKey();
          return (
            <button
              key={date}
              className={`heat-day ${isSelected ? "is-selected" : ""} ${isToday ? "is-today" : ""}`}
              onClick={() => onSelect(date)}
              aria-pressed={isSelected}
              aria-label={`${dateName(date)}: ${minutes} focused minutes`}
            >
              <span className="heat-date">{fromKey(date).getDate()}</span>
              <span className="heat-square" style={{ backgroundColor: HEAT_COLORS[level] }} />
              {minutes > 0 && <span className="heat-minutes">{minutes}m</span>}
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-end gap-1.5 mt-4 text-[10px] font-mono uppercase tracking-wide text-[#8A7F68]">
        <span>Less</span>{HEAT_COLORS.map((color) => <span key={color} className="legend-square" style={{ backgroundColor: color }} />)}<span>More</span>
      </div>
    </div>
  );
}

function DailyLog({ data, date, compact = false }: { data: AppData; date: string; compact?: boolean }) {
  const entries = data.logs
    .filter((entry) => entry.date === date)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const minutes = getMinutes(data.logs, date);
  return (
    <div className={compact ? "" : "daily-log"}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <SectionLabel>Daily ledger</SectionLabel>
          <h3 className="font-display text-xl -mt-1">{dateName(date)}</h3>
        </div>
        <div className="mini-total">{minutes}m<br /><span>focused</span></div>
      </div>
      {entries.length ? (
        <div className="space-y-2">
          {entries.map((entry) => {
            const Icon = entry.kind === "focus" ? Clock3 : entry.kind === "recall" ? Brain : entry.kind === "question" ? Target : CircleCheck;
            return (
              <div key={entry.id} className="ledger-entry">
                <div className="ledger-icon" style={{ color: SUBJECTS[entry.subject].color, background: SUBJECTS[entry.subject].wash }}><Icon size={15} /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm leading-snug text-[#2B2620]">{entry.title}</div>
                  <div className="text-[10px] font-mono uppercase tracking-wide text-[#8A7F68] mt-0.5"><SubjectDot subject={entry.subject} /> {SUBJECTS[entry.subject].short} · {compactTime(entry.timestamp)}</div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-ledger"><History size={18} /><span>No study trace for this day yet.</span></div>
      )}
    </div>
  );
}

function Dashboard({ data, selectedDate, setSelectedDate, setTab, setActiveSubject }: {
  data: AppData;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  setTab: (tab: TabKey) => void;
  setActiveSubject: (subject: SubjectKey) => void;
}) {
  const today = dayKey();
  const todayMinutes = getMinutes(data.logs, today);
  const currentWeek = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = shiftDay(index - 6);
    return { date, name: fromKey(date).toLocaleDateString("en-US", { weekday: "short" }), minutes: getMinutes(data.logs, date) };
  }), [data.logs]);
  const subjectTime = useMemo(() => SUBJECT_KEYS.map((subject) => ({
    subject,
    name: SUBJECTS[subject].short,
    minutes: data.logs.filter((entry) => entry.subject === subject && entry.date >= shiftDay(-6)).reduce((sum, entry) => sum + entry.minutes, 0),
    color: SUBJECTS[subject].color,
  })).filter((entry) => entry.minutes > 0), [data.logs]);
  const levelName = data.gamification.xp < 600 ? "Coffee House Reader" : data.gamification.xp < 1500 ? "Library Archivist" : "Master Academic";
  const weekMinutes = currentWeek.reduce((sum, item) => sum + item.minutes, 0);
  const tasks = data.tasks.filter((task) => task.date === today);

  return (
    <div className="dashboard-enter">
      <div className="welcome-card" style={{ backgroundImage: `linear-gradient(90deg, rgba(251,247,238,.94) 0%, rgba(251,247,238,.82) 45%, rgba(251,247,238,.2) 100%), url(${READING_ROOM})` }}>
        <div className="relative z-10 max-w-xl">
          <div className="ink-label text-[#8B6930]">Athenaeum · your reading room</div>
          <h1 className="font-display text-3xl sm:text-4xl leading-tight mt-1">A quiet record of <em className="font-normal text-[#8B6930]">intentional</em> study.</h1>
          <p className="text-sm text-[#625B4D] mt-3 max-w-md">Your work is starting to collect: one focused sitting, one recalled fact, one completed task at a time.</p>
          <button className="ink-button mt-5" onClick={() => setTab("focus")}><Clock3 size={15} /> Begin a sitting</button>
        </div>
      </div>

      <div className="metric-strip mt-5">
        <Surface className="metric-card"><Clock3 size={18} className="text-[#3B5A73]" /><div><span className="metric-value">{todayMinutes}<small> min</small></span><span className="metric-label">focused today</span></div></Surface>
        <Surface className="metric-card"><Flame size={18} className="text-[#8B3A3A]" /><div><span className="metric-value">{data.gamification.streak}<small> days</small></span><span className="metric-label">current streak</span></div></Surface>
        <Surface className="metric-card"><Trophy size={18} className="text-[#A9782F]" /><div><span className="metric-value">{data.gamification.xp}<small> XP</small></span><span className="metric-label">{levelName}</span></div></Surface>
      </div>

      <div className="content-split mt-7">
        <div className="space-y-7 min-w-0">
          <Surface className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 mb-5">
              <div><SectionLabel>Scholar’s Calendar</SectionLabel><h2 className="font-display text-2xl -mt-1">Study activity, day by day</h2></div>
              <button className="subtle-link" onClick={() => setTab("planner")}>Read the full ledger <ChevronRight size={15} /></button>
            </div>
            <CalendarHeatmap data={data} selectedDate={selectedDate} onSelect={setSelectedDate} />
          </Surface>
          <div className="grid lg:grid-cols-[1.04fr_.96fr] gap-5">
            <Surface className="p-5 relative overflow-hidden" style={{ backgroundImage: `linear-gradient(rgba(251,247,238,.93), rgba(251,247,238,.96)), url(${PAPER_TEXTURE})`, backgroundSize: "cover" }}>
              <div className="flex items-start justify-between gap-3"><div><SectionLabel>This week</SectionLabel><h2 className="font-display text-2xl -mt-1">{weekMinutes} minutes filed</h2></div><BarChart3 size={20} className="text-[#A9782F]" /></div>
              <div className="h-[170px] mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={currentWeek} margin={{ top: 12, left: -18, right: 0, bottom: 0 }}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#8A7F68", fontSize: 10, fontFamily: "IBM Plex Mono" }} />
                    <YAxis hide />
                    <Tooltip cursor={{ fill: "#EDE4D0", radius: 8 }} contentStyle={{ borderRadius: 12, border: "1px solid #E4DCC8", background: "#FBF7EE", fontFamily: "Source Sans 3" }} formatter={(value) => [`${value} min`, "Focused"]} />
                    <Bar dataKey="minutes" radius={[7, 7, 2, 2]}>{currentWeek.map((entry) => <Cell key={entry.date} fill={entry.date === today ? "#A9782F" : "#C9B58C"} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Surface>
            <Surface className="p-5"><DailyLog data={data} date={selectedDate} compact /></Surface>
          </div>
        </div>
        <aside className="space-y-5 min-w-0">
          <Surface className="p-5">
            <SectionLabel>This week’s balance</SectionLabel>
            <h2 className="font-display text-2xl -mt-1">Where your week went</h2>
            <p className="text-xs text-[#8A7F68] mt-1">Focus minutes by subject, last seven days.</p>
            <div className="space-y-3.5 mt-5">
              {subjectTime.length ? subjectTime.map((item) => {
                const max = Math.max(...subjectTime.map((entry) => entry.minutes));
                return <button key={item.subject} className="subject-bar" onClick={() => { setActiveSubject(item.subject); setTab("courses"); }}><span className="subject-bar-name"><SubjectDot subject={item.subject} />{item.name}</span><span className="subject-track"><span style={{ width: `${Math.max(10, (item.minutes / max) * 100)}%`, background: item.color }} /></span><span className="subject-minutes">{item.minutes}m</span></button>;
              }) : <div className="text-sm text-[#8A7F68] py-5">Your first completed sitting will appear here.</div>}
            </div>
          </Surface>
          <Surface className="p-5">
            <div className="flex items-center justify-between"><div><SectionLabel>Today’s docket</SectionLabel><h2 className="font-display text-xl -mt-1">{tasks.filter((task) => !task.done).length} items remain</h2></div><button className="icon-button" onClick={() => setTab("planner")} aria-label="Open planner"><CalendarDays size={16} /></button></div>
            <div className="space-y-2 mt-4">
              {tasks.slice(0, 4).map((task) => <div key={task.id} className="task-preview"><span className={`task-status ${task.done ? "is-done" : ""}`}>{task.done && <Check size={10} />}</span><span className={task.done ? "line-through text-[#9B907B]" : ""}>{task.title}</span><SubjectDot subject={task.subject} /></div>)}
            </div>
          </Surface>
          <Surface className="p-5 overflow-hidden relative"><div className="absolute inset-0 opacity-[.14] bg-cover" style={{ backgroundImage: `url(${PAPER_TEXTURE})` }} /><div className="relative"><SectionLabel>Recall queue</SectionLabel><h2 className="font-display text-xl -mt-1">{data.flashcards.filter((card) => card.dueDate <= today).length} cards ready</h2><button className="subtle-link mt-3" onClick={() => setTab("recall")}>Enter the recall desk <ChevronRight size={15} /></button></div></Surface>
        </aside>
      </div>
    </div>
  );
}

function Planner({ data, setData, selectedDate, setSelectedDate, notify }: {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  selectedDate: string;
  setSelectedDate: (value: string) => void;
  notify: (text: string) => void;
}) {
  const [view, setView] = useState<"agenda" | "calendar">("agenda");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState<SubjectKey>("history");
  const today = dayKey();
  const scheduled = useMemo(() => [...data.tasks].sort((a, b) => a.date.localeCompare(b.date)), [data.tasks]);
  const addTask = () => {
    if (!title.trim()) return;
    setData((current) => ({ ...current, tasks: [...current.tasks, { id: makeId("task"), title: title.trim(), subject, date: selectedDate || today, done: false }] }));
    setTitle("");
    notify("Task penciled into the planner.");
  };
  const toggleTask = (id: string) => {
    setData((current) => {
      const task = current.tasks.find((item) => item.id === id);
      if (!task) return current;
      const nowDone = !task.done;
      const tasks = current.tasks.map((item) => item.id === id ? { ...item, done: nowDone } : item);
      if (!nowDone) return { ...current, tasks, logs: current.logs.filter((log) => log.sourceId !== id) };
      return addActivity({ ...current, tasks }, { subject: task.subject, date: today, title: `Completed: ${task.title}`, kind: "task", minutes: 0, xp: 5, sourceId: id, countsForStreak: true });
    });
    notify("Completed work added to your daily ledger. +5 XP");
  };
  const removeTask = (id: string) => setData((current) => ({ ...current, tasks: current.tasks.filter((task) => task.id !== id), logs: current.logs.filter((log) => log.sourceId !== id) }));

  return (
    <div className="page-enter max-w-6xl">
      <PageHeading eyebrow="Reading room planner" title="Planner & calendar" copy="Keep the work ahead visible, and the work completed beautifully accounted for." />
      <div className="tab-switcher mb-6"><button className={view === "agenda" ? "active" : ""} onClick={() => setView("agenda")}>Agenda</button><button className={view === "calendar" ? "active" : ""} onClick={() => setView("calendar")}>Calendar & history</button></div>
      {view === "calendar" ? (
        <div className="grid xl:grid-cols-[1.35fr_.65fr] gap-5"><Surface className="p-5 sm:p-6"><CalendarHeatmap data={data} selectedDate={selectedDate} onSelect={setSelectedDate} /></Surface><Surface className="p-5"><DailyLog data={data} date={selectedDate} /></Surface></div>
      ) : (
        <div className="grid xl:grid-cols-[.9fr_1.1fr] gap-5">
          <Surface className="p-5 h-fit"><SectionLabel>New task</SectionLabel><h2 className="font-display text-2xl -mt-1">Add to {selectedDate === today ? "today" : dateName(selectedDate, true)}</h2><div className="space-y-3 mt-5"><input value={title} onChange={(event) => setTitle(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addTask()} className="field" placeholder="What needs your attention?" /><select className="field" value={subject} onChange={(event) => setSubject(event.target.value as SubjectKey)}>{SUBJECT_KEYS.map((key) => <option key={key} value={key}>{SUBJECTS[key].name}</option>)}</select><button className="ink-button w-full justify-center" onClick={addTask}><Plus size={15} /> Add to planner</button></div><div className="flex flex-wrap gap-2 mt-5">{[["French vocab — 15m", "french"], ["Calc BC problem set", "math"], ["Bio recall review", "bio"]].map(([taskTitle, taskSubject]) => <button key={taskTitle} className="quick-chip" onClick={() => { setTitle(taskTitle); setSubject(taskSubject as SubjectKey); }}><Plus size={12} />{taskTitle}</button>)}</div></Surface>
          <div className="space-y-5">{scheduled.length ? scheduled.map((task, index) => <Surface key={task.id} className="task-row"><div className="task-date"><span>{fromKey(task.date).toLocaleDateString("en-US", { month: "short" })}</span><strong>{fromKey(task.date).getDate()}</strong></div><button className={`complete-toggle ${task.done ? "checked" : ""}`} onClick={() => toggleTask(task.id)} aria-label={`Mark ${task.title} ${task.done ? "incomplete" : "complete"}`}>{task.done && <Check size={13} />}</button><div className="flex-1 min-w-0"><div className={`text-sm ${task.done ? "line-through text-[#9B907B]" : ""}`}>{task.title}</div><div className="text-[10px] font-mono uppercase tracking-wide text-[#8A7F68] mt-1"><SubjectDot subject={task.subject} /> {SUBJECTS[task.subject].short} · {task.date === today ? "today" : dateName(task.date, true)}</div></div><button className="delete-button" onClick={() => removeTask(task.id)} aria-label="Delete task"><X size={14} /></button></Surface>) : <Surface className="p-8 text-center text-sm text-[#8A7F68]">The page is clear. Add a considered task to begin.</Surface>}</div>
        </div>
      )}
    </div>
  );
}

function Focus({ data, setData, notify }: { data: AppData; setData: React.Dispatch<React.SetStateAction<AppData>>; notify: (text: string) => void }) {
  const [mode, setMode] = useState<"work" | "break">("work");
  const [subject, setSubject] = useState<SubjectKey>("history");
  const [secondsLeft, setSecondsLeft] = useState(data.settings.workMin * 60);
  const [running, setRunning] = useState(false);
  const completedRef = useRef(false);
  const totalSeconds = (mode === "work" ? data.settings.workMin : data.settings.breakMin) * 60;
  const progress = totalSeconds ? ((totalSeconds - secondsLeft) / totalSeconds) * 100 : 0;

  const reset = useCallback(() => { setRunning(false); setSecondsLeft(totalSeconds); completedRef.current = false; }, [totalSeconds]);
  const completeSession = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    const minutes = data.settings.workMin;
    setData((current) => addActivity(current, {
      subject,
      date: dayKey(),
      title: `Focus Session: ${SUBJECTS[subject].name} — ${minutes}m`,
      kind: "focus",
      minutes,
      xp: minutes,
      countsForStreak: true,
    }));
    notify(`${minutes} focused minutes filed to ${SUBJECTS[subject].short}. +${minutes} XP`);
    setMode("break");
  }, [data.settings.workMin, notify, setData, subject]);

  useEffect(() => { if (!running) setSecondsLeft(totalSeconds); }, [mode, totalSeconds, running]);
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          setRunning(false);
          if (mode === "work") completeSession(); else { setMode("work"); notify("Break complete. The desk is ready again."); }
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [completeSession, mode, notify, running]);

  const updateSetting = (key: "workMin" | "breakMin", value: number) => setData((current) => ({ ...current, settings: { ...current.settings, [key]: Math.min(key === "workMin" ? 90 : 30, Math.max(1, value || 1)) } }));
  const min = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const sec = String(secondsLeft % 60).padStart(2, "0");
  const circumference = 2 * Math.PI * 102;
  const color = mode === "work" ? SUBJECTS[subject].color : "#445540";

  return (
    <div className="page-enter max-w-4xl">
      <PageHeading eyebrow="Focus station" title="One sitting. One subject." copy="When the bell reaches zero, Athenaeum files the time to your subject, calendar, XP, and streak automatically." />
      <Surface className="focus-panel">
        <div className="focus-accent" style={{ background: SUBJECTS[subject].wash }} />
        <div className="relative z-10 flex flex-col items-center text-center">
          <select value={subject} onChange={(event) => setSubject(event.target.value as SubjectKey)} disabled={running} className="pill-select" style={{ borderColor: SUBJECTS[subject].color, color: SUBJECTS[subject].color }}>{SUBJECT_KEYS.map((key) => <option key={key} value={key}>{SUBJECTS[key].name}</option>)}</select>
          <div className="timer-orbit mt-7">
            <svg width="240" height="240" viewBox="0 0 240 240" aria-label={`${Math.round(progress)} percent elapsed`}><circle cx="120" cy="120" r="102" fill="none" stroke="#E8E0D0" strokeWidth="9" /><circle cx="120" cy="120" r="102" fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference - (progress / 100) * circumference} transform="rotate(-90 120 120)" className="progress-arc" /></svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="font-mono text-5xl tracking-tight">{min}:{sec}</span><span className="ink-label mt-1">{mode === "work" ? "focusing" : "resting"}</span></div>
          </div>
          <div className="flex items-center gap-3 mt-6"><button className="timer-play" onClick={() => setRunning((current) => !current)}>{running ? <Pause size={20} /> : <Play size={20} fill="currentColor" />}</button><button className="icon-button" onClick={reset} aria-label="Reset timer"><RotateCcw size={17} /></button></div>
          <div className="timer-settings mt-7"><label>Work <input type="number" min="1" max="90" disabled={running} value={data.settings.workMin} onChange={(event) => updateSetting("workMin", Number(event.target.value))} /></label><span>:</span><label>Break <input type="number" min="1" max="30" disabled={running} value={data.settings.breakMin} onChange={(event) => updateSetting("breakMin", Number(event.target.value))} /></label></div>
          <p className="text-xs text-[#8A7F68] mt-5 max-w-sm">No confirmation screen required. A completed work interval is immediately recorded as a dated focus session.</p>
        </div>
      </Surface>
    </div>
  );
}

function Courses({ data, setData, activeSubject, setActiveSubject, notify }: { data: AppData; setData: React.Dispatch<React.SetStateAction<AppData>>; activeSubject: SubjectKey; setActiveSubject: (subject: SubjectKey) => void; notify: (text: string) => void }) {
  const subject = SUBJECTS[activeSubject];
  const Icon = subject.icon;
  const topics = data.syllabus[activeSubject];
  const completion = subjectProgress(data, activeSubject);
  const toggleTopic = (id: string) => {
    setData((current) => {
      const topic = current.syllabus[activeSubject].find((item) => item.id === id);
      if (!topic) return current;
      const syllabus = { ...current.syllabus, [activeSubject]: current.syllabus[activeSubject].map((item) => item.id === id ? { ...item, done: !item.done } : item) };
      if (topic.done) return { ...current, syllabus };
      return addActivity({ ...current, syllabus }, { subject: activeSubject, date: dayKey(), title: `Course progress: ${subject.short} — ${topic.name}`, kind: "course", minutes: 0, xp: 10, sourceId: id, countsForStreak: true });
    });
    notify("Course progress added to today’s ledger. +10 XP");
  };

  return <div className="page-enter max-w-6xl"><PageHeading eyebrow="Course hub" title="Your subjects, in one index." copy="A small, legible view of each course’s progress and the focus time it has earned." />
    <div className="course-layout"><div className="course-rail">{SUBJECT_KEYS.map((key) => { const MetaIcon = SUBJECTS[key].icon; const active = key === activeSubject; return <button key={key} className={`course-rail-item ${active ? "active" : ""}`} onClick={() => setActiveSubject(key)}><span style={{ color: SUBJECTS[key].color, background: SUBJECTS[key].wash }}><MetaIcon size={16} /></span><div><strong>{SUBJECTS[key].short}</strong><small>{subjectProgress(data, key)}% complete</small></div></button>; })}</div>
      <Surface className="p-5 sm:p-7"><div className="flex items-start justify-between gap-4"><div className="flex items-center gap-3"><span className="subject-crest" style={{ color: subject.color, background: subject.wash }}><Icon size={24} /></span><div><SectionLabel>{subject.exam} course ledger</SectionLabel><h2 className="font-display text-3xl -mt-1">{subject.name}</h2></div></div><ProgressRing percent={completion} color={subject.color} size={65} /></div><div className="course-stat-row"><div><span>{data.subjectTotals[activeSubject]}m</span><small>focus filed</small></div><div><span>{topics.filter((topic) => topic.done).length}/{topics.length}</span><small>topics checked</small></div><div><span>{predictor(activeSubject, data.questions)?.score ?? "—"}</span><small>{subject.exam} trajectory</small></div></div><div className="space-y-2 mt-7">{topics.map((topic) => <button key={topic.id} className={`topic-row ${topic.done ? "done" : ""}`} onClick={() => toggleTopic(topic.id)}><span className="complete-toggle">{topic.done && <Check size={13} />}</span><span>{topic.name}</span>{topic.done && <span className="topic-filed">filed</span>}</button>)}</div></Surface></div>
  </div>;
}

function RecallDeck({ data, setData, notify }: { data: AppData; setData: React.Dispatch<React.SetStateAction<AppData>>; notify: (text: string) => void }) {
  const today = dayKey();
  const [filter, setFilter] = useState<SubjectKey | "all">("all");
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const queue = data.flashcards.filter((card) => card.dueDate <= today && (filter === "all" || card.subject === filter));
  const card = queue[cardIndex % Math.max(queue.length, 1)];
  useEffect(() => { setCardIndex(0); setFlipped(false); }, [filter]);
  const grade = (rating: "hard" | "good" | "easy") => {
    if (!card) return;
    const nextBox = rating === "hard" ? 1 : Math.min(5, card.box + (rating === "easy" ? 2 : 1));
    const days = rating === "hard" ? 1 : rating === "good" ? Math.max(2, 2 ** Math.min(nextBox, 3)) : Math.max(5, 2 ** Math.min(nextBox + 1, 4));
    setData((current) => {
      const flashcards = current.flashcards.map((item) => item.id === card.id ? { ...item, box: nextBox, dueDate: shiftDay(days), lastReviewed: today } : item);
      return addActivity({ ...current, flashcards }, { subject: card.subject, date: today, title: `Recall review: ${SUBJECTS[card.subject].short} · ${rating}`, kind: "recall", minutes: 0, xp: rating === "easy" ? 8 : rating === "good" ? 5 : 2, sourceId: card.id, countsForStreak: true });
    });
    notify(`${rating === "easy" ? "Easy" : rating === "good" ? "Good" : "Hard"} recorded. Card returns in ${days} day${days === 1 ? "" : "s"}.`);
    setFlipped(false);
    setCardIndex((index) => index + 1);
  };

  return <div className="page-enter max-w-5xl"><PageHeading eyebrow="Active recall" title="Recall Deck" copy="Turn the card only after you have made a real attempt. The next review date adapts to how it felt." />
    <div className="recall-toolbar"><div className="flex flex-wrap gap-2">{(["all", ...SUBJECT_KEYS] as Array<SubjectKey | "all">).map((key) => <button key={key} className={`filter-pill ${filter === key ? "active" : ""}`} onClick={() => setFilter(key)}>{key === "all" ? "All due" : SUBJECTS[key].short}</button>)}</div><span className="text-xs font-mono text-[#8A7F68]">{queue.length} due today</span></div>
    {card ? <div className="recall-stage"><button className="flashcard" onClick={() => setFlipped((state) => !state)} aria-label="Flip flashcard"><motion.div className="flashcard-inner" animate={{ rotateY: flipped ? 180 : 0 }} transition={{ duration: 0.42, ease: [0.23, 1, 0.32, 1] }}><div className="flash-face flash-front"><div className="flex justify-between items-start"><span className="flash-subject" style={{ color: SUBJECTS[card.subject].color, background: SUBJECTS[card.subject].wash }}><SubjectDot subject={card.subject} />{SUBJECTS[card.subject].short}</span><span className="font-mono text-[10px] uppercase tracking-wide text-[#8A7F68]">Box {card.box}</span></div><p>{card.front}</p><span className="flip-cue">Tap to reveal answer</span></div><div className="flash-face flash-back"><span className="flash-subject" style={{ color: SUBJECTS[card.subject].color, background: SUBJECTS[card.subject].wash }}>Answer</span><p>{card.back}</p><span className="flip-cue">How did it feel?</span></div></motion.div></button><AnimatePresence>{flipped && <motion.div className="grade-row" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.18 }}><button className="grade hard" onClick={() => grade("hard")}>Hard <small>tomorrow</small></button><button className="grade good" onClick={() => grade("good")}>Good <small>in a few days</small></button><button className="grade easy" onClick={() => grade("easy")}>Easy <small>next week</small></button></motion.div>}</AnimatePresence></div> : <Surface className="empty-recall"><Sparkles size={23} /><h2 className="font-display text-2xl">Your queue is clear.</h2><p>Everything in this deck has a future review date. Try another subject or return tomorrow.</p></Surface>}</div>;
}

function QuestionBank({ data, setData, notify }: { data: AppData; setData: React.Dispatch<React.SetStateAction<AppData>>; notify: (text: string) => void }) {
  const [subject, setSubject] = useState<SubjectKey>("physics");
  const [topic, setTopic] = useState("");
  const [earned, setEarned] = useState("8");
  const [total, setTotal] = useState("10");
  const estimate = predictor(subject, data.questions);
  const addQuestion = () => {
    const received = Number(earned);
    const possible = Number(total);
    if (!topic.trim() || !Number.isFinite(received) || !Number.isFinite(possible) || possible <= 0 || received < 0 || received > possible) { notify("Add a topic and a valid score before filing the question."); return; }
    const question: Question = { id: makeId("question"), subject, topic: topic.trim(), earned: received, total: possible, date: dayKey() };
    setData((current) => addActivity({ ...current, questions: [question, ...current.questions] }, { subject, date: question.date, title: `Question logged: ${SUBJECTS[subject].short} — ${question.topic} (${received}/${possible})`, kind: "question", minutes: 0, xp: 3, sourceId: question.id, countsForStreak: false }));
    setTopic("");
    notify("Score filed. Your trajectory has been refreshed. +3 XP");
  };
  const forecasts = SUBJECT_KEYS.filter((key) => predictor(key, data.questions));
  return <div className="page-enter max-w-6xl"><PageHeading eyebrow="Question bank" title="Make every mark teach you." copy="File scored questions here to reveal a rough, transparent indication of your current IB or AP trajectory." />
    <div className="grid xl:grid-cols-[.9fr_1.1fr] gap-5"><div className="space-y-5"><Surface className="predictor-card"><div className="flex justify-between items-start"><div><SectionLabel>Score predictor</SectionLabel><h2 className="font-display text-2xl -mt-1">{SUBJECTS[subject].short} trajectory</h2></div><GraduationCap size={20} className="text-[#A9782F]" /></div>{estimate ? <div className="prediction-main"><div className="prediction-score" style={{ color: SUBJECTS[subject].color }}>{estimate.score}</div><div><strong>{estimate.exam} score estimate</strong><p>{estimate.percent}% weighted raw score across {estimate.count} logged question{estimate.count === 1 ? "" : "s"}.</p></div></div> : <div className="prediction-empty">Log the first scored question for this subject to start an estimate.</div>}<p className="prediction-note">A study cue, not an official conversion. Boundaries vary by exam, subject, paper, and session.</p></Surface>
      <Surface className="p-5"><SectionLabel>File a score</SectionLabel><h2 className="font-display text-xl -mt-1">One question at a time</h2><div className="space-y-3 mt-5"><select className="field" value={subject} onChange={(event) => setSubject(event.target.value as SubjectKey)}>{SUBJECT_KEYS.map((key) => <option key={key} value={key}>{SUBJECTS[key].name}</option>)}</select><input className="field" value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Topic or question set" /><div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center"><input className="field text-center" type="number" min="0" value={earned} onChange={(event) => setEarned(event.target.value)} /><span className="font-mono text-[#8A7F68]">/</span><input className="field text-center" type="number" min="1" value={total} onChange={(event) => setTotal(event.target.value)} /></div><button className="ink-button w-full justify-center" onClick={addQuestion}><Plus size={15} /> File scored question</button></div></Surface></div>
      <div className="space-y-5"><Surface className="p-5"><div className="flex justify-between items-start"><div><SectionLabel>All current signals</SectionLabel><h2 className="font-display text-2xl -mt-1">Subject forecasts</h2></div><Target size={20} className="text-[#A9782F]" /></div><div className="forecast-grid mt-5">{forecasts.map((key) => { const forecast = predictor(key, data.questions)!; return <button className="forecast-cell" key={key} onClick={() => setSubject(key)}><span><SubjectDot subject={key} />{SUBJECTS[key].short}</span><strong style={{ color: SUBJECTS[key].color }}>{forecast.exam} {forecast.score}</strong><small>{forecast.percent}% raw</small></button>; })}</div></Surface>
        <Surface className="p-5"><SectionLabel>Recent question notes</SectionLabel><div className="space-y-2 mt-3">{data.questions.slice(0, 8).map((question) => <div className="question-row" key={question.id}><div><strong>{question.topic}</strong><small><SubjectDot subject={question.subject} /> {SUBJECTS[question.subject].short} · {dateName(question.date, true)}</small></div><span style={{ color: SUBJECTS[question.subject].color }}>{question.earned}/{question.total}</span></div>)}</div></Surface>
      </div></div>
  </div>;
}

function PageHeading({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return <header className="mb-7"><SectionLabel>{eyebrow}</SectionLabel><h1 className="font-display text-3xl sm:text-4xl -mt-1">{title}</h1><p className="text-sm text-[#8A7F68] mt-2 max-w-2xl">{copy}</p></header>;
}

export default function Home() {
  const [data, setData] = useState<AppData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem("athenaeum-data-v1");
      return saved ? hydrateData(JSON.parse(saved)) : makeDefaultData();
    } catch { return makeDefaultData(); }
  });
  const [tab, setTab] = useState<TabKey>("dashboard");
  const [activeSubject, setActiveSubject] = useState<SubjectKey>("history");
  const [selectedDate, setSelectedDate] = useState(dayKey());
  const [notice, setNotice] = useState("");
  const noticeTimer = useRef<number | undefined>(undefined);
  const notify = useCallback((message: string) => { setNotice(message); if (noticeTimer.current) window.clearTimeout(noticeTimer.current); noticeTimer.current = window.setTimeout(() => setNotice(""), 3400); }, []);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }, [data]);
  useEffect(() => () => { if (noticeTimer.current) window.clearTimeout(noticeTimer.current); }, []);

  const navigation: Array<{ key: TabKey; label: string; icon: LucideIcon }> = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "planner", label: "Planner", icon: CalendarDays },
    { key: "focus", label: "Focus Station", icon: Clock3 },
    { key: "courses", label: "Course Hub", icon: LibraryBig },
    { key: "recall", label: "Recall Deck", icon: Brain },
    { key: "bank", label: "Question Bank", icon: Sparkles },
  ];

  return <div className="athenaeum-shell"><aside className="app-sidebar"><div className="brand-block"><img src={BRAND_MARK} alt="" className="brand-mark" /><div><div className="font-display text-[22px] leading-none">Athenaeum</div><div className="ink-label mt-1">Reading room</div></div></div><nav className="sidebar-nav">{navigation.map((item) => { const Icon = item.icon; return <button key={item.key} onClick={() => setTab(item.key)} className={`nav-item ${tab === item.key ? "active" : ""}`}><Icon size={16} /><span>{item.label}</span>{item.key === "recall" && data.flashcards.filter((card) => card.dueDate <= dayKey()).length > 0 && <em>{data.flashcards.filter((card) => card.dueDate <= dayKey()).length}</em>}</button>; })}</nav><div className="sidebar-footer"><div><Flame size={15} className="text-[#8B3A3A]" /><span>{data.gamification.streak} day streak</span></div><div><Trophy size={15} className="text-[#A9782F]" /><span>{data.gamification.xp} XP earned</span></div></div></aside><main className="app-main"><AnimatePresence mode="wait">{tab === "dashboard" && <motion.div key="dashboard" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}><Dashboard data={data} selectedDate={selectedDate} setSelectedDate={setSelectedDate} setTab={setTab} setActiveSubject={setActiveSubject} /></motion.div>}{tab === "planner" && <motion.div key="planner" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}><Planner data={data} setData={setData} selectedDate={selectedDate} setSelectedDate={setSelectedDate} notify={notify} /></motion.div>}{tab === "focus" && <motion.div key="focus" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}><Focus data={data} setData={setData} notify={notify} /></motion.div>}{tab === "courses" && <motion.div key="courses" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}><Courses data={data} setData={setData} activeSubject={activeSubject} setActiveSubject={setActiveSubject} notify={notify} /></motion.div>}{tab === "recall" && <motion.div key="recall" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}><RecallDeck data={data} setData={setData} notify={notify} /></motion.div>}{tab === "bank" && <motion.div key="bank" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}><QuestionBank data={data} setData={setData} notify={notify} /></motion.div>}</AnimatePresence></main>{notice && <div className="study-toast" role="status"><CircleCheck size={16} />{notice}</div>}</div>;
}
