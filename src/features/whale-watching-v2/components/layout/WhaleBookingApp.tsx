"use client";

import { useBooking } from "../../hooks/useBooking";
import { useBookingStep } from "../../hooks/useBookingStep";

import { Header } from "./Header";
import { SummaryCard } from "./SummaryCard";
import { StepLayout } from "./StepLayout";

import { ProgressBar } from "../ui/ProgressBar";
import { NavigationButtons } from "../ui/NavigationButtons";

import { DateStep } from "../steps/DateStep";
import { DepartureStep } from "../steps/DepartureStep";
import { ManagerStep } from "../steps/ManagerStep";
import { ParticipantsStep } from "../steps/ParticipantsStep";
import { PaymentStep } from "../steps/PaymentStep";

export function WhaleBookingApp() {
  const {
    booking,
    total,
    updateBooking,
    updateParticipants,
  } = useBooking();

  const {
    currentStep,
    currentStepIndex,
    totalSteps,
    isFirstStep,
    isLastStep,
    goNext,
    goPrevious,
  } = useBookingStep();

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-100 via-cyan-50 to-white text-slate-900">
      <section className="mx-auto flex min-h-screen max-w-[1500px] flex-col px-6 py-10">
        <Header />

        <div className="grid flex-1 gap-8 lg:grid-cols-[1fr_420px]">
          <StepLayout
            step={currentStepIndex + 1}
            totalSteps={totalSteps}
          >
            <ProgressBar
              current={currentStepIndex + 1}
              total={totalSteps}
            />

            {currentStep === "date" && (
              <DateStep
                selectedDate={booking.selectedDate}
                onSelect={(date) =>
                  updateBooking("selectedDate", date)
                }
              />
            )}

            {currentStep === "departure" && (
              <DepartureStep
                selected={booking.departureTime}
                selectedDate={booking.selectedDate}
                onSelect={(time) =>
                  updateBooking("departureTime", time)
                }
              />
            )}

            {currentStep === "manager" && (
              <ManagerStep
                manager={booking.manager}
                onChange={(manager) =>
                  updateBooking("manager", manager)
                }
              />
            )}

            {currentStep === "participants" && (
              <ParticipantsStep
                participants={booking.participants}
                onChange={updateParticipants}
              />
            )}

            {currentStep === "payment" && (
              <PaymentStep total={total} />
            )}

            <NavigationButtons
              previous={goPrevious}
              next={goNext}
              disablePrevious={isFirstStep}
              disableNext={isLastStep}
            />
          </StepLayout>

          <SummaryCard
            booking={booking}
            total={total}
          />
        </div>
      </section>
    </main>
  );
}