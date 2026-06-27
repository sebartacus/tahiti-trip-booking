import { Participant } from "../types/booking";
import {
  MAX_OBSERVERS,
  MAX_WATER_PARTICIPANTS,
  SEASON,
} from "../data/constants";
import {
  countObservers,
  countWaterParticipants,
} from "./pricing";

export function isDateInSeason(date: string): boolean {
  return date >= SEASON.start && date <= SEASON.end;
}

export function getRemainingWaterPlaces(participants: Participant[]): number {
  return MAX_WATER_PARTICIPANTS - countWaterParticipants(participants);
}

export function getRemainingObserverPlaces(participants: Participant[]): number {
  return MAX_OBSERVERS - countObservers(participants);
}

export function canAddWaterParticipant(participants: Participant[]): boolean {
  return getRemainingWaterPlaces(participants) > 0;
}

export function canAddObserver(participants: Participant[]): boolean {
  return getRemainingObserverPlaces(participants) > 0;
}