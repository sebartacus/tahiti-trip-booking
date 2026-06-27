import { Participant } from "../types/booking";
import { PRICES } from "../data/constants";

export function calculateTotal(participants: Participant[]): number {
  return participants.reduce((total, participant) => {
    switch (participant.type) {
      case "water":
        return total + PRICES.water;

      case "adult_observer":
        return total + PRICES.adultObserver;

      case "child_observer":
        return total + PRICES.childObserver;

      default:
        return total;
    }
  }, 0);
}

export function countWaterParticipants(participants: Participant[]) {
  return participants.filter(
    (p) => p.type === "water"
  ).length;
}

export function countAdultObservers(participants: Participant[]) {
  return participants.filter(
    (p) => p.type === "adult_observer"
  ).length;
}

export function countChildObservers(participants: Participant[]) {
  return participants.filter(
    (p) => p.type === "child_observer"
  ).length;
}

export function countObservers(participants: Participant[]) {
  return participants.filter(
    (p) => p.type !== "water"
  ).length;
}