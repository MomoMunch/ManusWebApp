export function dayKey(value = new Date()) {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function fromKey(value: string) {
  return new Date(`${value}T12:00:00`);
}

export function shiftDay(days: number, base = new Date()) {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return dayKey(next);
}

export function formatDay(value: string, options: Intl.DateTimeFormatOptions = { weekday: "long", month: "long", day: "numeric" }) {
  return fromKey(value).toLocaleDateString("en-US", options);
}

export function formatTime(value: string) {
  if (!value) return "Any time";
  const [hour, minute] = value.split(":").map(Number);
  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
