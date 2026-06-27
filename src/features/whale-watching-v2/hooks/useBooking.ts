"use client";

import { useMemo, useState } from "react";
import { BookingState, Participant } from "../types/booking";
import { calculateTotal } from "../utils/pricing";

const initialState: BookingState = {
  selectedDate: null,
  departureTime: null,
  manager: {
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
  },
  participants: [],
};

export function useBooking() {
  const [booking, setBooking] = useState<BookingState>(initialState);

  const total = useMemo(
    () => calculateTotal(booking.participants),
    [booking.participants]
  );

  function updateBooking<K extends keyof BookingState>(
    key: K,
    value: BookingState[K]
  ) {
    setBooking((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function updateParticipants(participants: Participant[]) {
    setBooking((prev) => ({
      ...prev,
      participants,
    }));
  }

  function resetBooking() {
    setBooking(initialState);
  }

  return {
    booking,
    total,
    updateBooking,
    updateParticipants,
    resetBooking,
  };
}