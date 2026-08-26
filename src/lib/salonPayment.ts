export type SalonPaymentType="full"|"deposit";
export function isSalonPaymentType(value:unknown):value is SalonPaymentType{return value==="full"||value==="deposit"}
export function calculateSalonPayment(total:number,type:SalonPaymentType){const paid=type==="deposit"?Math.round(total*.3):total;return{total,paid,balance:total-paid,type}}
