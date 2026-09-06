import assert from "node:assert/strict";
import { candidatsPermis, compteursPermis, datePermis, groupesPermis, originePermis, piecesPermis, rechercherPermis, sansExamen, type PermisDossier } from "./permisPlanning";

for (const value of [null,undefined,"","  ","Plus tard"," Plus tard "]) assert.equal(sansExamen(value),true);
assert.equal(sansExamen("12 août 2026"),false);
assert.equal(originePermis("salon"),"Salon");
assert.equal(originePermis("salon_admin"),"Salon");
const site = {origine_reservation:"site",pricing_type:"salon_tourisme"};
assert.equal(originePermis(site.origine_reservation),"Site");
assert.equal(originePermis(null),"Non renseignée");
assert.equal(candidatsPermis({id:1,prenom2:"  ",nom2:""}).length,1);
assert.equal(candidatsPermis({id:1,prenom2:"Alice"}).length,2);
assert.equal(candidatsPermis({id:1,nom2:"Martin"}).length,2);
const keys = ["certificat_url","formulaire_url","photo_url","identite_url"] as const;
for(let count=0;count<=4;count++) {
 const row:PermisDossier={id:1};
 keys.forEach((key,index) => row[key]=index<count ? "document.pdf" : " ");
 assert.equal(piecesPermis(row),count);
}
assert.equal(datePermis("12 août 2026"),"2026-08-12");
assert.equal(datePermis("12/08/2026"),"2026-08-12");
assert.equal(datePermis("2026-08-12"),"2026-08-12");
for(const value of ["31/02/2026","2026-13-01","demain","29 février 2025"]) assert.equal(datePermis(value),null);
assert.equal(datePermis("29 février 2024"),"2024-02-29");
const rows:PermisDossier[]=[
 {id:1,prenom:"Élodie",nom:"Durand",prenom2:"Alice",nom2:"Martin",examen:"16 septembre 2026",date_cours:"15/09/2026",creneau:"15h00 - 17h00"},
 {id:2,examen:"16/09/2026",date_cours:"15/09/2026",creneau:"07h00 - 09h00"},
 {id:3,examen:"23 septembre 2026",date_cours:"15/09/2026",creneau:"07h00 - 09h00"},
 {id:4,examen:"12 août 2026",date_cours:"11/08/2026"},
 {id:5,examen:"inconnue",date_cours:"impossible"},
 {id:6,examen:"Plus tard"},
 {id:7,archived:true,examen:"16/09/2026",date_cours:"15/09/2026"},
];
const exams=groupesPermis(rows,"examen","2026-09-06");
assert.deepEqual(exams.map(g=>g.date),["2026-09-16","2026-09-23"]);
assert.equal(exams[0].dossiers.length,2);
assert.equal(exams[0].dossiers.reduce((n,r)=>n+candidatsPermis(r).length,0),3);
const courses=groupesPermis(rows,"cours","2026-09-06");
assert.deepEqual(courses.map(g=>g.creneau),["07h00 - 09h00","15h00 - 17h00"]);
assert.equal(courses[0].dossiers.length,2);
assert.equal(groupesPermis([{id:8,examen:"06/09/2026"}],"examen","2026-09-06").length,1);
assert.equal(rechercherPermis(rows[0],"alice martin"),true);
assert.equal(rechercherPermis(rows[0],"durand elodie"),true);
assert.equal(rechercherPermis(rows[0],"inconnu"),false);
assert.deepEqual(compteursPermis([{id:1,prenom2:"Alice"},{id:2,archived:true}]),{sansDates:2,sansExamen:2,sansCours:2,incomplets:1});
const snapshot:PermisDossier[] = Array.from({length:20},(_,id)=>({id,examen:"Plus tard"}));
snapshot.push({id:20,examen:"12 août 2026",date_cours:"11/08/2026"});
for(let id=21;id<23;id++) snapshot.push({id,examen:"12 août 2026",date_cours:"11/08/2026",...Object.fromEntries(keys.map(key=>[key,"document.pdf"]))});
assert.deepEqual(compteursPermis(snapshot),{sansDates:20,sansExamen:20,sansCours:20,incomplets:21});
console.log("Tests Suivi Permis : OK");
