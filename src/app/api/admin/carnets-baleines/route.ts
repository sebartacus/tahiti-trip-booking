import { NextResponse } from "next/server";
import {
  getAdminSupabaseClient,
} from "@/lib/adminCarnetsBaleines";
import { verifyAdminSession } from "@/lib/adminSession";

type Mouvement = {
  carnet_id: string;
  created_at: string | null;
  mouvement: number;
  reservation_id: string | null;
};

type Reservation = {
  id: string;
  date_sortie: string | null;
  depart: string | null;
};

export async function GET(request: Request) {
  if (!verifyAdminSession(request)) {
    return NextResponse.json({ error: "Accès admin refusé." }, { status: 401 });
  }

  const supabase = getAdminSupabaseClient();
  const carnetsResponse = await supabase
    .from("carnets_baleines")
    .select(
      "id,code,prenom_acheteur,nom_acheteur,telephone,email,type_carnet,credits_initiaux,credits_restants,prix,created_at,paid_at,date_expiration,statut,paiement_effectue,facture_numero,facture_url,email_sent,email_sent_at,mode_paiement,reference_paiement,montant_encaisse,origine_creation,commentaire_interne,facture_remise"
    )
    .order("created_at", { ascending: false });

  if (carnetsResponse.error) {
    console.error(
      "Erreur Supabase chargement carnets Baleines :",
      carnetsResponse.error
    );
    return NextResponse.json(
      {
        error: "Impossible de charger les carnets Baleines.",
        ...(process.env.NODE_ENV === "development"
          ? { supabaseError: carnetsResponse.error.message }
          : {}),
      },
      { status: 500 }
    );
  }

  const carnets = carnetsResponse.data || [];
  const carnetIds = carnets.map((carnet) => String(carnet.id));
  const mouvementsResponse =
    carnetIds.length > 0
      ? await supabase
          .from("mouvements_carnets_baleines")
          .select("carnet_id,reservation_id,mouvement,created_at")
          .in("carnet_id", carnetIds)
          .lt("mouvement", 0)
          .order("created_at", { ascending: false })
      : { data: [] as Mouvement[], error: null };

  if (mouvementsResponse.error) {
    return NextResponse.json(
      { error: "Impossible de charger l’historique des carnets." },
      { status: 500 }
    );
  }

  const mouvements = (mouvementsResponse.data || []) as Mouvement[];
  const reservationIds = [
    ...new Set(
      mouvements
        .map((mouvement) => mouvement.reservation_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const reservationsResponse =
    reservationIds.length > 0
      ? await supabase
          .from("reservations_baleines")
          .select("id,date_sortie,depart")
          .in("id", reservationIds)
      : { data: [] as Reservation[], error: null };

  if (reservationsResponse.error) {
    return NextResponse.json(
      { error: "Impossible de charger les réservations associées." },
      { status: 500 }
    );
  }

  const reservations = new Map(
    ((reservationsResponse.data || []) as Reservation[]).map((reservation) => [
      String(reservation.id),
      reservation,
    ])
  );
  const historiqueParCarnet = new Map<string, Array<Record<string, unknown>>>();

  for (const mouvement of mouvements) {
    const reservation = mouvement.reservation_id
      ? reservations.get(String(mouvement.reservation_id))
      : undefined;
    const historique = historiqueParCarnet.get(String(mouvement.carnet_id)) || [];

    historique.push({
      date_utilisation: mouvement.created_at,
      date_sortie: reservation?.date_sortie || null,
      depart: reservation?.depart || null,
      credits_consommes: Math.abs(Number(mouvement.mouvement)),
      reservation_id: mouvement.reservation_id,
    });
    historiqueParCarnet.set(String(mouvement.carnet_id), historique);
  }

  return NextResponse.json({
    carnets: carnets.map((carnet) => ({
      ...carnet,
      historique: historiqueParCarnet.get(String(carnet.id)) || [],
    })),
  });
}
