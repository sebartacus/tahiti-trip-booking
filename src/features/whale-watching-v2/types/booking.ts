export type DepartureTime = "07:00" | "13:15";

export type ParticipantType =
  | "water"
  | "adult_observer"
  | "child_observer";

export type WetsuitSize =
  | "XS"
  | "S"
  | "M"
  | "L"
  | "XL"
  | "XXL";

export type FinsSize =
  | "35-36"
  | "37-38"
  | "39-40"
  | "41-42"
  | "43-44"
  | "45-46";

export type Participant = {
  id: string;
  firstName: string;
  lastName: string;
  age: string;
  type: ParticipantType;
  hasOwnGear: boolean;
  wetsuitSize?: WetsuitSize;
  finsSize?: FinsSize;
};

export type BookingManager = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
};

export type BookingState = {
  selectedDate: string | null;
  departureTime: DepartureTime | null;
  manager: BookingManager;
  participants: Participant[];
};