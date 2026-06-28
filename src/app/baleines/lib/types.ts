export type Depart = "07:00" | "13:15";

export type Role = "mise_eau" | "observateur";

export type Participant = {
  prenom: string;
  nom: string;
  age: string;
  role: Role;
  materielPerso: boolean;
  tailleCombinaison: string;
  pointurePalmes: string;
};

export type Demandes = {
  miseEau: number;
  observateurs: number;
};

export type Capacites = {
  miseEauRestantes: number;
  observateursRestants: number;
};
