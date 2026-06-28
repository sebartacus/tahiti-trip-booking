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

const STEP_TITLES = {
  date: "Date",
  departure: "Depart",
  manager: "Contact",
  participants: "Participants",
  payment: "Paiement",
};

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

  const stepContent = {
    date: (
      <DateStep
        selectedDate={booking.selectedDate}
        onSelect={(date) =>
          updateBooking("selectedDate", date)
        }
      />
    ),
    departure: (
      <DepartureStep
        selected={booking.departureTime}
        selectedDate={booking.selectedDate}
        onSelect={(time) =>
          updateBooking("departureTime", time)
        }
      />
    ),
    manager: (
      <ManagerStep
        manager={booking.manager}
        onChange={(manager) =>
          updateBooking("manager", manager)
        }
      />
    ),
    participants: (
      <ParticipantsStep
        participants={booking.participants}
        onChange={updateParticipants}
      />
    ),
    payment: (
      <div className="space-y-5">
        <PaymentStep total={total} />

        <SummaryCard
          booking={booking}
          total={total}
        />
      </div>
    ),
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#bae6fd_0%,#ecfeff_38%,#f8fafc_74%)] text-slate-900">
      <section className="mx-auto flex min-h-screen w-full max-w-[460px] flex-col px-3 py-3 sm:px-5 sm:py-5">
        <div className="relative flex min-h-[calc(100vh-24px)] flex-col overflow-hidden rounded-[42px] border border-white/80 bg-slate-950 shadow-[0_30px_90px_rgba(15,23,42,0.28)] sm:min-h-[calc(100vh-40px)]">
          <div className="pointer-events-none absolute inset-x-16 top-2 z-20 h-7 rounded-b-3xl bg-slate-950" />

          <div className="relative z-10 border-b border-white/10 bg-slate-950/95 px-4 pb-4 pt-8 text-white backdrop-blur">
            <ProgressBar
              current={currentStepIndex + 1}
              total={totalSteps}
            />

            <div className="mt-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-100/70">
                  Whale Watching
                </p>

                <h1 className="mt-1 text-2xl font-black leading-none">
                  {STEP_TITLES[currentStep]}
                </h1>
              </div>

              <div className="rounded-full bg-white/10 px-3 py-2 text-xs font-black text-cyan-50">
                {currentStepIndex + 1}/{totalSteps}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-100 px-3 pb-28 pt-3 sm:px-4">
            {currentStepIndex === 0 && (
              <div className="whale-panel-rise mb-3">
                <Header />
              </div>
            )}

            <StepLayout
              key={currentStep}
              step={currentStepIndex + 1}
              totalSteps={totalSteps}
            >
              {stepContent[currentStep]}
            </StepLayout>
          </div>

          <NavigationButtons
            previous={goPrevious}
            next={goNext}
            disablePrevious={isFirstStep}
            disableNext={isLastStep}
          />
        </div>
      </section>
    </main>
  );
}
