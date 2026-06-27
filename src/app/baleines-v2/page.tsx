"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Depart = "07:00" | "13:15";

type TypeParticipant =
  | "mise_eau"
  | "observateur_adulte"
  | "observateur_enfant";

type Participant = {
  id: string;
  prenom: string;
  nom: string;
  type: TypeParticipant;
  materielPerso: boolean;
  combinaison: string;
  palmes: string;
  ouvert: boolean;
};

const COMBINAISONS = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
];

const PALMES = [
  "34","35","36","37","38","39","40","41",
  "42","43","44","45","46","47","48","49"
];

const SAISON_DEBUT="2026-07-20";
const SAISON_FIN="2026-11-20";

const TARIF_MISE_EAU=15000;
const TARIF_OBS=8500;
const TARIF_ENFANT=7000;

const MAX_MISE_EAU=6;
const MAX_OBS=2;

function nouveauParticipant():Participant{

    return{

        id:crypto.randomUUID(),

        prenom:"",
        nom:"",
        type:"mise_eau",

        materielPerso:false,

        combinaison:"",
        palmes:"",

        ouvert:true

    }

}

function prix(p:Participant){

    switch(p.type){

        case "mise_eau":
            return TARIF_MISE_EAU;

        case "observateur_adulte":
            return TARIF_OBS;

        default:
            return TARIF_ENFANT;

    }

}

export default function BaleinesV2(){

const [date,setDate]=useState("");

const [depart,setDepart]=useState<Depart>("07:00");

const [responsable,setResponsable]=useState({

prenom:"",
nom:"",
telephone:"",
email:""

});

const [participants,setParticipants]=useState<Participant>([
nouveauParticipant()
] as any);

const [miseEauOccupees,setMiseEauOccupees]=useState(0);
const [obsOccupees,setObsOccupees]=useState(0);

const [chargement,setChargement]=useState(false);

const [erreur,setErreur]=useState("");

const [message,setMessage]=useState("");

const [paiement,setPaiement]=useState(false);

const resume=useMemo(()=>{

let mise=0;
let obs=0;
let total=0;

participants.forEach((p:any)=>{

total+=prix(p);

if(p.type==="mise_eau") mise++;

else obs++;

});

return{

mise,

obs,

total

}

},[participants]);

useEffect(()=>{

if(!date) return;

chargerDisponibilites();

},[date,depart]);

async function chargerDisponibilites(){

setChargement(true);

const {data}=await supabase

.from("reservations_baleines")

.select("participants")

.eq("date_sortie",date)

.eq("depart",depart);

let mise=0;

let obs=0;

(data||[]).forEach((r:any)=>{

(r.participants||[]).forEach((p:any)=>{

if(p.type==="mise_eau"||p.role==="mise_eau") mise++;

else obs++;

});

});

setMiseEauOccupees(mise);

setObsOccupees(obs);

setChargement(false);

}