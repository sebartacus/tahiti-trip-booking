import { DepartureTime, FinsSize, WetsuitSize } from "../types/booking";

export const SEASON = {
  start: "2026-07-20",
  end: "2026-11-20",
};

export const DEPARTURES: DepartureTime[] = [
  "07:00",
  "13:15",
];

export const MAX_WATER_PARTICIPANTS = 6;
export const MAX_OBSERVERS = 2;

export const PRICES = {
  water: 15000,
  adultObserver: 8500,
  childObserver: 7000,
};

export const WETSUIT_SIZES: WetsuitSize[] = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
];

export const FINS_SIZES: FinsSize[] = [
  "35-36",
  "37-38",
  "39-40",
  "41-42",
  "43-44",
  "45-46",
];