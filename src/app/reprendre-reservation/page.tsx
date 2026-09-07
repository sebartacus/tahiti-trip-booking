import LegacyReprise from "./LegacyReprise";
import SecureReprise from "./SecureReprise";

export const dynamic = "force-dynamic";

export default function ReprendreReservationPage() {
  return process.env.PERMIS_REPRISE_ACCESS_ENABLED === "true"
    ? <SecureReprise />
    : <LegacyReprise />;
}
