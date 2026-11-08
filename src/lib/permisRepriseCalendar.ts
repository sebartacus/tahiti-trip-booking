import { datePermis } from "./permisPlanning";
import { parsePermisSlot } from "./permisScheduling";
import { permisHolidays, permisHolidayYearCovered } from "./permisHolidays";

const holidays = new Set(permisHolidays);
export function addPermisDays(iso: string, days: number) {
  const date = new Date(iso + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function permisExamClosed(iso: string) { return iso >= "2026-12-23" && iso <= "2027-01-12"; }
export function permisExamAvailable(value: string, today: string, requireVerifiedHolidays = true) {
 const iso=datePermis(value);
 if(!iso||permisExamClosed(iso)||(requireVerifiedHolidays&&!permisHolidayYearCovered(iso)))return false;
 const weekday=new Date(iso+"T12:00:00Z").getUTCDay(),previous=addPermisDays(iso,-1);
 return (weekday===3&&!holidays.has(iso)||weekday===4&&holidays.has(previous))&&today<=addPermisDays(iso,-8);
}
export function permisExamOptions(today: string, requireVerifiedHolidays = true, blocked: readonly string[] = []) {
 const dates:string[]=[];
 for(let offset=1;offset<=90&&dates.length<4;offset++){const day=addPermisDays(today,offset);if(permisExamAvailable(day,today,requireVerifiedHolidays)&&!blocked.includes(day))dates.push(day);}
 return dates;
}
export function permisExamSessions(today: string, blocked: readonly string[] = [], numeric = false) {
 const label=(iso:string)=>new Date(iso+"T12:00:00Z").toLocaleDateString("fr-FR",{timeZone:"UTC",...(numeric?{}:{day:"numeric",month:"long",year:"numeric"} as const)});
 return permisExamOptions(today,true,blocked).map(iso=>({iso,value:label(iso),label:"Session du "+label(iso),limite:label(addPermisDays(iso,-8))}));
}
export function permisExamCalendarWarnings(today: string) {
 const years=new Set<string>();
 for(let offset=1;offset<=90;offset++){const day=addPermisDays(today,offset);if(new Date(day+"T12:00:00Z").getUTCDay()===3&&!permisExamClosed(day)&&!permisHolidayYearCovered(day))years.add(day.slice(0,4));}
 return [...years].map(year=>year==="2027"?"Calendrier 2027 partiel : seules les sessions des 13, 20 et 27 janvier sont renseignées. Les sessions suivantes attendent la vérification des jours fériés.":"Jours fériés "+year+" à renseigner et vérifier : les sessions non renseignées ne sont pas proposées.");
}
export function permisAllowedSlots(day: string, typeCours?: string | null) {
  const individual = ["07h00 - 09h00","09h00 - 11h00","11h00 - 13h00","13h00 - 15h00","15h00 - 17h00"];
  const common = ["07h00 - 11h00","09h00 - 13h00","11h00 - 15h00","13h00 - 17h00"];
  const slots = typeCours === "commun" ? common : typeCours === "individuel" ? individual : [...individual, "13h00 - 17h00"];
  return slots.filter(slot => new Date(day + "T12:00:00Z").getUTCDay() !== 3 || parsePermisSlot(slot)!.start >= 780);
}
export function validPermisIso(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && datePermis(value) === value;
}
