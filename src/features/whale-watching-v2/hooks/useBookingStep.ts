"use client";

import { useState } from "react";

export const BOOKING_STEPS = [
  "date",
  "departure",
  "manager",
  "participants",
  "payment",
] as const;

export type BookingStep = (typeof BOOKING_STEPS)[number];

export function useBookingStep() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const currentStep = BOOKING_STEPS[currentStepIndex];

  function goNext() {
    setCurrentStepIndex((prev) =>
      Math.min(prev + 1, BOOKING_STEPS.length - 1)
    );
  }

  function goPrevious() {
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
  }

  function goToStep(step: BookingStep) {
    const index = BOOKING_STEPS.indexOf(step);
    setCurrentStepIndex(index);
  }

  return {
    currentStep,
    currentStepIndex,
    totalSteps: BOOKING_STEPS.length,
    goNext,
    goPrevious,
    goToStep,
  };
}