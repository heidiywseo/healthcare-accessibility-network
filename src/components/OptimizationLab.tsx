import { useMemo, useState } from 'react';
import { ArrowRight, BarChart3, GitBranch, LocateFixed, Scale } from 'lucide-react';
import type { Patient, Provider } from '../data/scenario';
import { allocateCare, chooseSite, evaluateSites, proposedClinic, COHORT_DEMAND } from '../model/network';

type Props={patients:Patient[];providers:Provider[];baselinePatients:Patient[];baselineProviders:Provider[];onAddClinic:(provider:Provider)=>void};
const pct=(v:number)=>`${(v*100).toFixed(0)}%`;
const one=(v:number)=>v.toFixed(1);

function AssignmentGraph({patients,providers,assignments}:{patients:Patient[];providers:Provider[];assignments:ReturnType<typeof allocateCare>['assignments']}){
  const height=Math.max(230,Math.max(patients.length,providers.length)*49+32);
  const py=(i:number)=>height*(i+1)/(patients.length+1);
  const hy=(j:number)=>height*(j+1)/(providers.length+1);
  return <div className="assignment-graph"><svg viewBox={`0 0 650 ${height}`} role="img" aria-label="Patient cohorts at left connected to assigned clinics at right; each line shows the number of assigned patients" preserveAspectRatio="xMidYMid meet">
    {assignments.map(a=>{const i=patients.findIndex(p=>p.id===a.patientId),j=providers.findIndex(p=>p.id===a.providerId);if(i<0||j<0)return null;return <g key={`${a.patientId}-${a.providerId}`}><line x1="152" y1={py(i)} x2="480" y2={hy(j)} stroke="#25a48e" strokeWidth={1.5+a.count*.55} opacity=".48"/><title>{`${patients[i].name} → ${providers[j].name}: ${a.count} matched, score ${a.score}`}</title></g>})}
    {patients.map((p,i)=><g key={p.id}><rect x="8" y={py(i)-16} width="144" height="32" rx="9" fill="#eaf0fc" stroke="#b6c9ee"/><text x="80" y={py(i)+4} textAnchor="middle" fontSize="12" fontWeight="650" fill="#34588d">{p.name} · {COHORT_DEMAND[p.id]??1} seeking</text></g>)}
    {providers.map((h,j)=><g key={h.id}><rect x="480" y={hy(j)-16} width="162" height="32" rx="9" fill="#e5f6ef" stroke="#afe2ce"/><text x="561" y={hy(j)+4} textAnchor="middle" fontSize="11" fontWeight="650" fill="#23715a">{h.name.length>19?h.name.slice(0,18)+'…':h.name} · {h.slots}</text></g>)}
   </svg><div className="network-legend">Line thickness = number of matched care seekers · Hover a connection for details · Unserved demand has no edge</div></div>;
}

export function OptimizationLab({patients,providers,baselinePatients,baselineProviders,onAddClinic}:Props){
 const [objective,setObjective]=useState<'efficiency'|'equity'>('efficiency');
 const [selectedSite,setSelectedSite]=useState<string|null>(null);
 const allocation=useMemo(()=>allocateCare(patients,providers),[patients,providers]);
 const baseline=useMemo(()=>allocateCare(baselinePatients,baselineProviders),[baselinePatients,baselineProviders]);
 const sites=useMemo(()=>evaluateSites(patients,providers),[patients,providers]);
 const recommended=chooseSite(sites,objective);
 const displayed=sites.find(s=>s.candidate.id===selectedSite)??recommended;
 const maxDemand=Math.max(1,...allocation.byPatient.map(p=>p.demand));
 return <div className="optimization-stack">
  <section className="panel optimization-panel">
   <div className="opt-head"><div><div className="panel-title"><GitBranch size={18}/> Capacity-constrained patient matching</div><p>Four patient profiles represent <strong>{allocation.demand} care seekers</strong>. A min-cost-flow algorithm assigns as many as possible to eligible clinics without exceeding appointment capacity.</p></div></div>
   <div className="opt-stats">
    <div><span>MATCHED TO CARE</span><strong>{allocation.served}<small> / {allocation.demand}</small></strong><small>{allocation.served-baseline.served>=0?'+':''}{allocation.served-baseline.served} vs. original baseline</small></div>
    <div><span>UNSERVED DEMAND</span><strong>{allocation.unserved}</strong><small>Not assigned to an available eligible slot</small></div>
    <div><span>AVERAGE REALIZED ACCESS</span><strong>{one(allocation.meanDemandScore)}<small> /100</small></strong><small>Includes zero for unserved care seekers</small></div>
    <div><span>LEAST-SERVED COHORT</span><strong>{pct(allocation.minimumCoverage)}</strong><small>Minimum cohort assignment rate</small></div>
   </div>
   <div className="opt-two-cols"><div><h3>Flow through the network</h3><AssignmentGraph patients={patients} providers={providers} assignments={allocation.assignments}/></div><div><h3>Who actually gets an appointment?</h3><div className="cohort-rows">{allocation.byPatient.map(p=>{const patient=patients.find(x=>x.id===p.patientId)!;return <div className="cohort-row" key={p.patientId}><div className="cohort-label"><strong>{patient.name}</strong><span>{p.served} of {p.demand} matched · {pct(p.rate)}</span></div><div className="cohort-track"><div style={{width:`${100*p.served/maxDemand}%`}}/><span style={{left:`${100*p.demand/maxDemand}%`}}/></div></div>})}</div><div className="opt-caption">Green = assigned patients; tick = cohort demand. A patient can have a high score yet remain unmatched when capacity runs out.</div><h3 className="opt-small-header">Clinic utilization</h3><div className="clinic-util">{allocation.byProvider.map(c=><div key={c.providerId} className="util-line"><span>{providers.find(p=>p.id===c.providerId)?.name}</span><div className="util-track"><div style={{width:`${c.capacity?c.assigned/c.capacity*100:0}%`}}/></div><b>{c.assigned}/{c.capacity}</b></div>)}</div></div></div>
  </section>
  <section className="panel optimization-panel">
   <div className="opt-head"><div><div className="panel-title"><LocateFixed size={18}/> Find the best location for a new clinic</div><p>Evaluate ten candidate sites by adding an 18-slot clinic accepting all three plans. Each site triggers a fresh network assignment.</p></div></div>
   <div className="objective-picker"><button className={objective==='efficiency'?'selected':''} onClick={()=>{setObjective('efficiency');setSelectedSite(null)}}><BarChart3 size={17}/><span><strong>Efficiency</strong><small>Most people served, then highest total accessibility</small></span></button><button className={objective==='equity'?'selected':''} onClick={()=>{setObjective('equity');setSelectedSite(null)}}><Scale size={17}/><span><strong>Equity</strong><small>Highest minimum cohort coverage, then total served</small></span></button></div>
   <div className="site-layout"><div className="site-field"><div className="field-label">SELECT A CANDIDATE SITE</div><div className="site-grid">{sites.map(s=><button key={s.candidate.id} className={displayed?.candidate.id===s.candidate.id?'selected':''} onClick={()=>setSelectedSite(s.candidate.id)}><span>{s.candidate.label}</span><small>+{s.servedGain} matched</small></button>)}</div></div><div className="site-outcome"><div className="outcome-head"><LocateFixed size={16}/><span>{selectedSite?'Selected site':'Algorithm recommendation'}</span></div><h3>{displayed?.candidate.label??'No site available'}</h3><div className="site-outcome-stats"><div><span>EXTRA MATCHED</span><strong>+{displayed?.servedGain??0}</strong></div><div><span>REALIZED ACCESS CHANGE</span><strong>{displayed && displayed.qualityGain>=0?'+':''}{one(displayed?.qualityGain??0)}</strong></div><div><span>WORST GROUP COVERAGE</span><strong>{pct(displayed?.allocation.minimumCoverage??0)}</strong></div></div><button className="apply-site" disabled={!displayed} onClick={()=>{if(displayed)onAddClinic(proposedClinic(displayed.candidate))}}>Add this clinic to the live scenario <ArrowRight size={16}/></button><p>The clinic is added to the map and to the assignment model. All scores are recalculated.</p></div></div>
   <div className="optimization-explainer"><strong>What the mathematics is doing</strong><p><b>Matching:</b> maximize number served first, then maximize the sum of accessibility scores, subject to plan eligibility, score threshold, and clinic capacity. <b>Site optimization:</b> enumerate candidate locations and solve the matching problem for each. <b>Equity:</b> instead of maximizing aggregate benefit, prioritize the worst-served cohort.</p></div>
  </section>
 </div>;
}
