export type Plan = 'Plan A' | 'Plan B' | 'Plan C';
export type Transport = 'Transit' | 'Car';
export type Point = { x: number; y: number };
export type Patient = { id: string; name: string; area: string; age: number; insurance: Plan; transport: Transport; location: Point; group: string };
export type Provider = { id: string; name: string; area: string; location: Point; plans: Plan[]; waitDays: number; slots: number; added?: boolean };

// All records are invented. Map coordinates are schematic 0–100 display units, NOT real lat/lon.
export const patients: Patient[] = [
  { id: 'a', name: 'Patient A', area: 'West Philadelphia', age: 28, insurance: 'Plan A', transport: 'Transit', location: { x: 25, y: 49 }, group: 'Transit-dependent' },
  { id: 'b', name: 'Patient B', area: 'Center City', age: 43, insurance: 'Plan B', transport: 'Car', location: { x: 56, y: 48 }, group: 'Car access' },
  { id: 'c', name: 'Patient C', area: 'North Philadelphia', age: 37, insurance: 'Plan C', transport: 'Transit', location: { x: 61, y: 21 }, group: 'Transit-dependent' },
  { id: 'd', name: 'Patient D', area: 'South Philadelphia', age: 51, insurance: 'Plan A', transport: 'Transit', location: { x: 52, y: 81 }, group: 'Transit-dependent' },
];
export const providers: Provider[] = [
  { id: 'x', name: 'Rittenhouse Wellness', area: 'Center City', location: { x: 51, y: 49 }, plans: ['Plan A', 'Plan B'], waitDays: 21, slots: 12 },
  { id: 'y', name: 'Westside Counseling', area: 'West Philadelphia', location: { x: 20, y: 44 }, plans: ['Plan B', 'Plan C'], waitDays: 5, slots: 8 },
  { id: 'z', name: 'North Point Care', area: 'North Philadelphia', location: { x: 64, y: 25 }, plans: ['Plan A', 'Plan C'], waitDays: 12, slots: 16 },
  { id: 'w', name: 'South Street Health', area: 'South Philadelphia', location: { x: 55, y: 71 }, plans: ['Plan A', 'Plan B', 'Plan C'], waitDays: 30, slots: 10 },
  { id: 'v', name: 'University Therapy', area: 'University City', location: { x: 32, y: 55 }, plans: ['Plan B'], waitDays: 7, slots: 6 },
  { id: 'q', name: 'Riverbend Mental Health', area: 'Northeast Philadelphia', location: { x: 84, y: 35 }, plans: ['Plan C'], waitDays: 9, slots: 14 },
];
export const plans: Plan[] = ['Plan A', 'Plan B', 'Plan C'];
