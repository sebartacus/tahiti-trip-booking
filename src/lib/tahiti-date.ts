const TAHITI_TIME_ZONE = "Pacific/Tahiti";

export type TahitiDateParts = {
  year: number;
  month: number;
  day: number;
};

export function getTahitiDateParts(now: Date = new Date()): TahitiDateParts {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: TAHITI_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return { year: value("year"), month: value("month"), day: value("day") };
}

export function getTahitiToday(now: Date = new Date()) {
  const { year, month, day } = getTahitiDateParts(now);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function getTahitiCurrentMonth(now: Date = new Date()) {
  return getTahitiToday(now).slice(0, 7);
}

// Date civile locale destinée aux composants qui lisent getFullYear/getMonth.
export function getTahitiTodayAsLocalDate(now: Date = new Date()) {
  const { year, month, day } = getTahitiDateParts(now);
  return new Date(year, month - 1, day);
}

export function getTahitiCurrentMonthAsLocalDate(now: Date = new Date()) {
  const { year, month } = getTahitiDateParts(now);
  return new Date(year, month - 1, 1);
}

export function getTahitiCurrentMonthAsUtcDate(now: Date = new Date()) {
  const { year, month } = getTahitiDateParts(now);
  return new Date(Date.UTC(year, month - 1, 1));
}
