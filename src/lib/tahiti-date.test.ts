// @ts-expect-error Node's type-stripping test runner requires the source extension.
import { getTahitiCurrentMonth, getTahitiDateParts, getTahitiToday } from "./tahiti-date.ts";

function assertEqual(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) throw new Error(`${message}: ${actual} !== ${expected}`);
}

const augustTahiti = new Date("2026-08-13T12:00:00-10:00");
assertEqual(getTahitiCurrentMonth(augustTahiti), "2026-08", "Mois courant Tahiti");
assertEqual(getTahitiToday(augustTahiti), "2026-08-13", "Jour courant Tahiti");

// A 00:30 UTC, Tahiti est encore au jour et au mois precedents.
const utcMonthBoundary = new Date("2026-09-01T00:30:00Z");
assertEqual(getTahitiCurrentMonth(utcMonthBoundary), "2026-08", "Frontiere mensuelle UTC/Tahiti");
assertEqual(getTahitiDateParts(utcMonthBoundary).day, 31, "Frontiere journaliere UTC/Tahiti");
