import type { Patient, Provider } from '../data/scenario';

export const WEIGHTS = { travel: 0.6, wait: 0.4 } as const;
export const VIABLE_THRESHOLD = 50;
export type AccessResult = { provider: Provider; travelMinutes: number; distanceMiles: number; travelScore: number; waitScore: number; insuranceAccepted: boolean; capacityAvailable: boolean; score: number; viable: boolean; weightedTravel: number; weightedWait: number };

// Schematic coordinates. 1 unit ~= 0.12 miles. This is not a routing model.
export function distanceMiles(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y) * 0.12;
}
export function estimateTravelMinutes(patient: Patient, provider: Provider) {
  const miles = distanceMiles(patient.location, provider.location);
  // Hypothetical: car ~18mph + 5m parking; transit ~9mph + 10m access/wait.
  return Math.round(patient.transport === 'Car' ? 5 + miles / 18 * 60 : 10 + miles / 9 * 60);
}
export function scoreAccess(patient: Patient, provider: Provider): AccessResult {
  const distance = distanceMiles(patient.location, provider.location);
  const minutes = estimateTravelMinutes(patient, provider);
  const travelScore = Math.max(0, 100 - 2 * minutes);
  const waitScore = Math.max(0, 100 - 2 * provider.waitDays);
  const insuranceAccepted = provider.plans.includes(patient.insurance);
  const capacityAvailable = provider.slots > 0;
  const weightedTravel = WEIGHTS.travel * travelScore;
  const weightedWait = WEIGHTS.wait * waitScore;
  const score = insuranceAccepted && capacityAvailable ? Math.round((weightedTravel + weightedWait) * 10) / 10 : 0;
  return { provider, travelMinutes: minutes, distanceMiles: Math.round(distance * 10) / 10, travelScore, waitScore, insuranceAccepted, capacityAvailable, score, viable: insuranceAccepted && capacityAvailable && score >= VIABLE_THRESHOLD, weightedTravel, weightedWait };
}
export function rankProviders(patient: Patient, list: Provider[]) {
  return list.map(p => scoreAccess(patient, p)).sort((a,b) => b.score-a.score || a.travelMinutes-b.travelMinutes);
}
export function bestScore(patient: Patient, list: Provider[]) { return rankProviders(patient, list)[0]?.score ?? 0; }
export function summaryForPopulation(population: Patient[], list: Provider[]) {
  const scores = population.map(p => bestScore(p, list));
  const viableCount = population.filter(p => rankProviders(p, list).some(r => r.viable)).length;
  return { average: scores.length ? scores.reduce((a,b)=>a+b,0)/scores.length : 0, viableCount, total: population.length, scores };
}
