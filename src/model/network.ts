import type { Patient, Provider, Point } from '../data/scenario';
import { scoreAccess, VIABLE_THRESHOLD } from './accessibility';

/** Each synthetic profile represents a fictional cohort of care seekers, not one identifiable person. */
export const COHORT_DEMAND: Record<string, number> = { a: 21, b: 18, c: 23, d: 17 };
export type Assignment = { patientId: string; providerId: string; count: number; score: number };
export type Allocation = {
  assignments: Assignment[];
  served: number;
  demand: number;
  unserved: number;
  totalScore: number;
  meanServedScore: number;
  meanDemandScore: number;
  byPatient: { patientId: string; demand: number; served: number; scoreTotal: number; rate: number }[];
  byProvider: { providerId: string; capacity: number; assigned: number }[];
  minimumCoverage: number;
};

type Arc = { to: number; rev: number; cap: number; cost: number; original: number };
function addArc(graph: Arc[][], from: number, to: number, cap: number, cost: number) {
  const f: Arc = { to, rev: graph[to].length, cap, cost, original: cap };
  const r: Arc = { to: from, rev: graph[from].length, cap: 0, cost: -cost, original: 0 };
  graph[from].push(f); graph[to].push(r);
  return f;
}

/** Min-cost max-flow with an unserved sink arc. An unserved penalty larger than the maximal aggregate score cost
 * lexicographically prioritizes served headcount, then accessibility quality.
 * The graph is small (< 100 synthetic people), so Bellman–Ford is sufficient.
 */
export function allocateCare(patients: Patient[], providers: Provider[], demandOverride: Record<string, number> = COHORT_DEMAND): Allocation {
  const n = patients.length, m = providers.length;
  const source = 0, p0 = 1, h0 = 1+n, sink = 1+n+m;
  const graph: Arc[][] = Array.from({length:sink+1},()=>[]);
  const links: {i:number;j:number;arc:Arc;score:number}[] = [];
  const totalDemand = patients.reduce((s,p)=>s+Math.max(0,Math.floor(demandOverride[p.id]??1)),0);
  const unservedPenalty=(totalDemand+1)*1001;
  patients.forEach((p,i)=>{
    const demand = Math.max(0,Math.floor(demandOverride[p.id]??1));
    addArc(graph,source,p0+i,demand,0);
    addArc(graph,p0+i,sink,demand,unservedPenalty); // unserved, never falsely counted as served
    providers.forEach((h,j)=>{
      const r=scoreAccess(p,h);
      if(r.viable) {
        const arc=addArc(graph,p0+i,h0+j,demand,1000-Math.round(r.score*10));
        links.push({i,j,arc,score:r.score});
      }
    });
  });
  providers.forEach((h,j)=>addArc(graph,h0+j,sink,Math.max(0,Math.floor(h.slots)),0));
  let flow=0;
  while(flow<totalDemand){
    const dist=Array(graph.length).fill(Infinity);
    const parentNode=Array(graph.length).fill(-1);
    const parentEdge=Array(graph.length).fill(-1);
    dist[source]=0;
    for(let k=0;k<graph.length-1;k++){
      let updated=false;
      for(let u=0;u<graph.length;u++)if(Number.isFinite(dist[u])){
        graph[u].forEach((e,ei)=>{
          if(e.cap>0 && dist[e.to]>dist[u]+e.cost){dist[e.to]=dist[u]+e.cost;parentNode[e.to]=u;parentEdge[e.to]=ei;updated=true;}
        });
      }
      if(!updated)break;
    }
    if(parentNode[sink]<0)break;
    let increment=totalDemand-flow;
    for(let v=sink;v!==source;v=parentNode[v]) increment=Math.min(increment,graph[parentNode[v]][parentEdge[v]].cap);
    for(let v=sink;v!==source;v=parentNode[v]){
      const e=graph[parentNode[v]][parentEdge[v]];
      e.cap-=increment;graph[v][e.rev].cap+=increment;
    }
    flow+=increment;
  }
  const assignments:Assignment[]=links.filter(x=>x.arc.original>x.arc.cap).map(x=>({patientId:patients[x.i].id,providerId:providers[x.j].id,count:x.arc.original-x.arc.cap,score:x.score}));
  const served=assignments.reduce((s,a)=>s+a.count,0);
  const totalScore=assignments.reduce((s,a)=>s+a.count*a.score,0);
  const byPatient=patients.map(p=>{
    const demand=Math.max(0,Math.floor(demandOverride[p.id]??1));
    const matched=assignments.filter(a=>a.patientId===p.id);
    const n=matched.reduce((s,a)=>s+a.count,0);
    return {patientId:p.id,demand,served:n,scoreTotal:matched.reduce((s,a)=>s+a.count*a.score,0),rate:demand>0?n/demand:1};
  });
  const byProvider=providers.map(h=>({providerId:h.id,capacity:Math.max(0,Math.floor(h.slots)),assigned:assignments.filter(a=>a.providerId===h.id).reduce((s,a)=>s+a.count,0)}));
  return {assignments,served,demand:totalDemand,unserved:totalDemand-served,totalScore,meanServedScore:served?totalScore/served:0,meanDemandScore:totalDemand?totalScore/totalDemand:0,byPatient,byProvider,minimumCoverage:byPatient.length?Math.min(...byPatient.map(p=>p.rate)):1};
}

export type Candidate = { id:string; label:string; location:Point };
export const CANDIDATE_SITES: Candidate[] = [
  {id:'west',label:'West Philly',location:{x:20,y:51}},
  {id:'university',label:'University City',location:{x:34,y:56}},
  {id:'center',label:'Center City',location:{x:53,y:47}},
  {id:'north',label:'North Philly',location:{x:61,y:20}},
  {id:'northwest',label:'Northwest',location:{x:37,y:26}},
  {id:'northeast',label:'Northeast',location:{x:80,y:25}},
  {id:'south',label:'South Philly',location:{x:52,y:85}},
  {id:'southwest',label:'Southwest',location:{x:28,y:79}},
  {id:'river',label:'River Wards',location:{x:76,y:50}},
  {id:'east',label:'East Side',location:{x:70,y:71}},
];
export type SiteEvaluation={candidate:Candidate;allocation:Allocation;servedGain:number;qualityGain:number;equityGain:number};
export function proposedClinic(site:Candidate, plans:Provider['plans']=['Plan A','Plan B','Plan C'],slots=18):Provider {
  return {id:`optimal-${site.id}`,name:`Proposed ${site.label} Clinic`,area:site.label,location:site.location,plans:[...plans],waitDays:7,slots,added:true};
}
export function evaluateSites(patients:Patient[],providers:Provider[],slots=18):SiteEvaluation[]{
  const base=allocateCare(patients,providers);
  return CANDIDATE_SITES.map(candidate=>{
    const allocation=allocateCare(patients,[...providers,proposedClinic(candidate,undefined,slots)]);
    return {candidate,allocation,servedGain:allocation.served-base.served,qualityGain:allocation.meanDemandScore-base.meanDemandScore,equityGain:allocation.minimumCoverage-base.minimumCoverage};
  });
}
/** Efficiency: first maximize served count, then aggregate accessibility quality.
 * Equity: maximize worst cohort coverage, then total served, then quality.
 */
export function chooseSite(sites:SiteEvaluation[],objective:'efficiency'|'equity') {
  const sorted=[...sites].sort((a,b)=>objective==='efficiency'
    ? b.allocation.served-a.allocation.served || b.allocation.totalScore-a.allocation.totalScore
    : b.allocation.minimumCoverage-a.allocation.minimumCoverage || b.allocation.served-a.allocation.served || b.allocation.totalScore-a.allocation.totalScore);
  return sorted[0]??null;
}
export { VIABLE_THRESHOLD };
