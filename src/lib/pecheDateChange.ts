import { buildPecheInvoicePdf, type PecheInvoiceReservation } from "./pecheInvoice";

export interface PecheMoveDatabase {
  rpc(name: string, params: Record<string, unknown>): PromiseLike<{
    data: unknown;
    error: { code?: string; message: string } | null;
  }>;
}
export interface PecheMoveStorage {
  assertExists(path: string): Promise<void>;
  upload(path: string, pdf: Buffer): Promise<void>;
  remove(path: string): Promise<void>;
}
type MoveContext = {
  reservation: PecheInvoiceReservation & { facture_numero: string | null; facture_url: string | null };
  salon: null | {
    sale_id: string; designation: string; payment_method: string;
    total: number; paid: number; balance: number; valid_until: string | null;
  };
  date: string; invoice_number: string | null; issued_at: string;
};
export class PecheMoveError extends Error {
  constructor(message: string, public readonly uncertain = false) { super(message); }
}
async function rpc(db: PecheMoveDatabase, name: string, params: Record<string, unknown>) {
  const { data, error } = await db.rpc(name, params);
  if (error) throw Object.assign(new Error(error.message), { code: error.code });
  return data;
}
function databaseRejected(error: unknown) {
  // A PostgreSQL SQLSTATE means the RPC transaction was rejected. A transport
  // failure / missing response does not tell us whether the transaction committed.
  const code = (error as { code?: string })?.code;
  return typeof code === "string" && /^[0-9A-Z]{5}$/.test(code) &&
    !code.startsWith("08") && !["40003", "57014", "57P01", "57P02", "57P03"].includes(code);
}

export async function movePecheWithInvoice(
  db: PecheMoveDatabase, storage: PecheMoveStorage,
  input: { reservationId: string; date: string; expectedDate: string },
) {
  const params = { p_reservation_id: input.reservationId, p_date: input.date, p_expected_date: input.expectedDate };
  // Preparation consumes a number but changes neither the reservation nor its
  // current invoice. No SQL transaction stays open during the Storage upload.
  const context = await rpc(db, "prepare_peche_date_change", params) as MoveContext;
  if (!context) throw new Error("Préparation du déplacement absente.");
  let uploadedPath: string | null = null;
  let finalizationStarted = false;
  try {
    if (context.invoice_number) {
      const old = context.reservation;
      if (!old.facture_url || !old.facture_numero) throw new Error("Ancienne facture absente.");
      await storage.assertExists(old.facture_url);
      const salon = context.salon;
      const methods: Record<string, string> = { tpe: "Carte bancaire / TPE", especes: "Espèces", cheque: "Chèque", virement: "Virement" };
      const invoice = buildPecheInvoicePdf(
        { ...old, date_sortie: context.date },
        new Date(context.issued_at),
        {
          invoiceNumber: context.invoice_number,
          replacesInvoiceNumber: old.facture_numero,
          ...(salon ? {
            designation: salon.designation, paymentMethod: methods[salon.payment_method] || salon.payment_method,
            totalTtc: salon.total, amountPaid: salon.paid, balance: salon.balance, validUntil: salon.valid_until,
          } : {}),
        },
      );
      const path = `factures/peche/remplacements/${context.invoice_number}.pdf`;
      await storage.upload(path, invoice.pdf);
      uploadedPath = path;
    }
    finalizationStarted = true;
    const result = await rpc(db, "move_peche_reservation", { ...params, p_prepared: context }) as {
      date: string; invoiceNumber: string | null;
    };
    if (!result || result.date !== input.date) throw new Error("Réponse RPC incomplète.");
    return result;
  } catch (error) {
    if (finalizationStarted && !databaseRejected(error)) {
      // Never delete a PDF that may already be referenced by a committed RPC.
      throw new PecheMoveError("Confirmation interrompue. Rechargez la réservation pour vérifier sa date avant de réessayer.", true);
    }
    if (uploadedPath) {
      try { await storage.remove(uploadedPath); } catch { /* Only an unreferenced new PDF may remain. */ }
    }
    throw error;
  }
}
