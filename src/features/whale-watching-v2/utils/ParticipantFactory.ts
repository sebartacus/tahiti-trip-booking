import { Participant } from "../types/booking";

export function createParticipant(): Participant {
  return {
    id: crypto.randomUUID(),
    firstName: "",
    lastName: "",
    age: "",
    type: "water",
    hasOwnGear: false,
  };
}