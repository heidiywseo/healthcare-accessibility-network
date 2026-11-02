import { useMemo, useState } from 'react';
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, CheckCircle2, ChevronDown, Clock3, MapPinned, Plus, RotateCcw, SlidersHorizontal, TrainFront, UsersRound, X } from 'lucide-react';
import { patients as basePatients, providers as baseProviders, plans, type Patient, type Provider, type Plan, type Point } from './data/scenario';
import { bestScore, rankProviders, scoreAccess, summaryForPopulation, VIABLE_THRESHOLD } from './model/accessibility';
import { CityMap } from './components/CityMap';
import { OptimizationLab } from './components/OptimizationLab';

const cloneProviders = () => baseProviders.map(p=>({...p,plans:[...p.plans],location:{...p.location}}));
const clonePatients = () => basePatients.map(p=>({...p,location:{...p.location}}));
const fmt = (n:number) => n.toFixed(1);

export default function App() {
 const [selectedPatientId,setSelectedPatientId] = useState('a');
 const [population,setPopulation] = useState<Patient[]>(clonePatients);
 const [clinics,setClinics] = useState<Provider[]>(cloneProviders);
 const [selectedClinicId,setSelectedClinicId] = useState<string|null>('x');
 const [placing,setPlacing] = useState(false);
 const [tab,setTab] = useState<'patient'|'population'|'optimization'>('patient');
 const [nextClinic,setNextClinic] = useState(1);
 const patient = population.find(p=>p.id===selectedPatientId)!;
 const rankings = useMemo(()=>rankProviders(patient,clinics),[patient,clinics]);
 const baselinePatient = basePatients.find(p=>p.id===selectedPatientId)!;
 const baselineRankings = rankProviders(baselinePatient,baseProviders);
 const currentSummary = summaryForPopulation(population,clinics);
 const baseSummary = summaryForPopulation(basePatients,baseProviders);
 const selectedClinic = clinics.find(p=>p.id===selectedClinicId) ?? null;
 const selectedResult = selectedClinic ? scoreAccess(patient,selectedClinic) : null;
 const best = rankings[0];
 const bestBefore = baselineRankings[0];
 const changed = JSON.stringify(population)!==JSON.stringify(basePatients) || JSON.stringify(clinics)!==JSON.stringify(baseProviders);
 const adjustPatient = (updates:Partial<Patient>)=>setPopulation(prev=>prev.map(p=>p.id===selectedPatientId?{...p,...updates}:p));
 const adjustClinic = (id:string,updates:Partial<Provider>)=>setClinics(prev=>prev.map(p=>p.id===id?{...p,...updates}:p));
 function reset(){setPopulation(clonePatients());setClinics(cloneProviders());setPlacing(false);setNextClinic(1);setSelectedClinicId('x');}
 function placeClinic(location:Point){
   const id = `new-${nextClinic}`;
   setClinics(prev=>[...prev,{id,name:`New Community Clinic ${nextClinic}`,area:'Proposed location',location,plans:[patient.insurance],waitDays:7,slots:12,added:true}]);
   setSelectedClinicId(id);setNextClinic(v=>v+1);setPlacing(false);
 }
 function insertRecommendedClinic(clinic:Provider){setClinics(prev=>[...prev.filter(c=>c.id!==clinic.id),clinic]);setSelectedClinicId(clinic.id);setPlacing(false);}
 function togglePlan(plan:Plan){if(!selectedClinic)return;adjustClinic(selectedClinic.id,{plans:selectedClinic.plans.includes(plan)?selectedClinic.plans.filter(x=>x!==plan):[...selectedClinic.plans,plan]});}
 const beforeIndividual = bestBefore?.score??0;
 const afterIndividual = best?.score??0;
 const deltaIndividual = afterIndividual-beforeIndividual;
 const deltaPopulation = currentSummary.average-baseSummary.average;
 return <div className="app-shell">
  <header className="header"><h1>Healthcare Access Simulator</h1><button className="reset-btn" disabled={!changed} onClick={reset}><RotateCcw size={15}/> Reset</button></header>
  <main className="workspace">
   <div className="workspace-grid">
    <aside className="sidebar">
     <div className="panel section-panel"><div className="panel-head"><div className="panel-title"><UsersRound size={17}/> Patient profile</div></div>
      <label className="field-label" htmlFor="patient-select">SELECT PATIENT</label><div className="select-wrap"><select id="patient-select" value={selectedPatientId} onChange={e=>{setSelectedPatientId(e.target.value);setSelectedClinicId(null)}}>{population.map(p=><option key={p.id} value={p.id}>{p.name} · {p.area}</option>)}</select><ChevronDown size={16}/></div>
      <div className="patient-meta"><div className="avatar">{patient.name.slice(-1)}</div><div><strong>{patient.name}</strong><span>{patient.area} · Age {patient.age}</span></div></div>
      <label className="field-label" htmlFor="plan-select">INSURANCE PLAN</label><div className="select-wrap"><select id="plan-select" value={patient.insurance} onChange={e=>adjustPatient({insurance:e.target.value as Plan})}>{plans.map(p=><option key={p}>{p}</option>)}</select><ChevronDown size={16}/></div>
      <label className="field-label">TRANSPORTATION ACCESS</label><div className="segmented"><button className={patient.transport==='Transit'?'active':''} onClick={()=>adjustPatient({transport:'Transit'})}><TrainFront size={15}/> Transit</button><button className={patient.transport==='Car'?'active':''} onClick={()=>adjustPatient({transport:'Car'})}><MapPinned size={15}/> Car</button></div>
     </div>
     <div className="panel section-panel intervention-panel"><div className="panel-head"><div className="panel-title"><SlidersHorizontal size={17}/> Test an intervention</div></div><p className="small-desc">Change insurance or transportation above, or introduce a new provider below.</p>
      <button className={`add-clinic-btn ${placing?'active':''}`} onClick={()=>setPlacing(v=>!v)}><Plus size={17}/>{placing?'Cancel clinic placement':'Add a new clinic'}<ArrowRight size={16}/></button>
      <div className="helper">{placing?'Click anywhere on the map to place your proposed clinic.':'Then edit its insurance, capacity, and wait time to test its impact.'}</div>
      <div className="section-divider"/><div className="subheading"><Clock3 size={15}/> Provider-level intervention</div>
      <label className="field-label" htmlFor="edit-clinic">EDIT A PROVIDER</label><div className="select-wrap"><select id="edit-clinic" value={selectedClinicId??''} onChange={e=>setSelectedClinicId(e.target.value||null)}><option value="">Choose a provider...</option>{clinics.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select><ChevronDown size={16}/></div>
      {selectedClinic&&<div className="provider-form"><label className="field-label" htmlFor="wait-input">APPOINTMENT WAIT <strong>{selectedClinic.waitDays} days</strong></label><input id="wait-input" type="range" min="0" max="45" value={selectedClinic.waitDays} onChange={e=>adjustClinic(selectedClinic.id,{waitDays:Number(e.target.value)})}/><div className="range-labels"><span>0 days</span><span>45 days</span></div>
       <label className="field-label" htmlFor="slots-input">OPEN APPOINTMENT SLOTS <strong>{selectedClinic.slots}</strong></label><input id="slots-input" type="range" min="0" max="40" value={selectedClinic.slots} onChange={e=>adjustClinic(selectedClinic.id,{slots:Number(e.target.value)})}/><div className="range-labels"><span>No capacity</span><span>40 slots</span></div>
       <label className="field-label">ACCEPTED INSURANCE</label><div className="plan-checks">{plans.map(p=><label key={p}><input type="checkbox" checked={selectedClinic.plans.includes(p)} onChange={()=>togglePlan(p)}/>{p}</label>)}</div>
       {selectedClinic.added&&<button className="remove-clinic" onClick={()=>{setClinics(prev=>prev.filter(p=>p.id!==selectedClinic.id));setSelectedClinicId(null)}}><X size={13}/> Remove proposed clinic</button>}
      </div>}
     </div>
    </aside>
    <section className="main-column">
     <div className="panel map-panel"><div className="map-header"><div><div className="panel-title"><MapPinned size={18}/> Patient–provider network</div><p>Each numbered marker is a provider's accessibility score for <strong>{patient.name}</strong>. Click a marker for details.</p></div><span className="map-count">{clinics.length} providers</span></div>
       <CityMap patient={patient} providers={clinics} selectedId={selectedClinicId} onSelect={setSelectedClinicId} placing={placing} onPlace={placeClinic}/>
     </div>
     <div className="metrics-grid">
       <div className="metric-card"><span className="metric-label">BEST ACCESSIBILITY SCORE</span><div className="metric-main">{fmt(afterIndividual)} <small>/100</small></div><div className={`metric-change ${deltaIndividual>0?'positive':deltaIndividual<0?'negative':''}`}>{deltaIndividual>0?<ArrowUpRight size={14}/>:deltaIndividual<0?<ArrowDownRight size={14}/>:null}{deltaIndividual===0?'No change from baseline':`${deltaIndividual>0?'+':''}${fmt(deltaIndividual)} vs. baseline`}</div></div>
       <div className="metric-card"><span className="metric-label">VIABLE PROVIDERS</span><div className="metric-main">{rankings.filter(r=>r.viable).length} <small>/ {clinics.length}</small></div><div className="metric-foot">Eligible and scoring ≥ {VIABLE_THRESHOLD}</div></div>
       <div className="metric-card"><span className="metric-label">TOP RECOMMENDATION</span><div className="metric-provider">{best&&best.score>0?best.provider.name:'No eligible provider'}</div><div className="metric-foot">{best&&best.score>0?`${best.travelMinutes} min estimated travel · ${best.provider.waitDays} day wait`:'Consider changing an access barrier'}</div></div>
     </div>
     <div className="panel results-panel"><div className="results-top"><div><div className="panel-title"><Activity size={18}/> Accessibility results</div><p>Compare outcomes for the selected patient or the full population.</p></div><div className="tabs"><button className={tab==='patient'?'on':''} onClick={()=>setTab('patient')}>Individual</button><button className={tab==='population'?'on':''} onClick={()=>setTab('population')}>Population</button><button className={tab==='optimization'?'on':''} onClick={()=>setTab('optimization')}>Optimize network</button></div></div>
      {tab==='optimization'?<OptimizationLab patients={population} providers={clinics} baselinePatients={basePatients} baselineProviders={baseProviders} onAddClinic={insertRecommendedClinic}/>:tab==='patient'?<div className="results-content"><div className="rankings"><div className="list-header"><span>PROVIDER RANKING</span><span>ACCESS SCORE</span></div>{rankings.map((r,index)=><button className={`ranking-row ${selectedClinicId===r.provider.id?'selected':''}`} key={r.provider.id} onClick={()=>setSelectedClinicId(r.provider.id)}><div className="rank-index">{index+1}</div><div className="rank-name"><strong>{r.provider.name}</strong><span>{r.insuranceAccepted?(r.capacityAvailable?`${r.travelMinutes} min travel · ${r.provider.waitDays}d wait`:'No appointment capacity'):'Insurance not accepted'}</span></div><div className="rank-score"><strong style={{color:r.score===0?'#ca7068':r.score>=65?'#228d74':'#bc893a'}}>{fmt(r.score)}</strong><div className="bar-track"><div style={{width:`${r.score}%`,background:r.score===0?'#ca7068':r.score>=65?'#228d74':'#d4a04d'}}/></div></div></button>)}</div>
       <div className="score-breakdown"><div className="breakdown-head"><span>SCORE EXPLAINER</span></div>{selectedResult?<><h3>{selectedResult.provider.name}</h3><div className="breakdown-score">{fmt(selectedResult.score)}<span>/100</span></div><div className="breakdown-status">{selectedResult.insuranceAccepted&&selectedResult.capacityAvailable?<><CheckCircle2 size={15}/> Eligible provider</>:<><X size={15}/> {!selectedResult.insuranceAccepted?'Insurance incompatible':'No appointment slots'}</>}</div>
         <div className="breakdown-line"><span>Travel · {selectedResult.travelMinutes} min</span><strong>{fmt(selectedResult.travelScore)} × 60%</strong></div><div className="bar-track thick"><div style={{width:`${selectedResult.travelScore}%`,background:'#5374c9'}}/></div>
         <div className="breakdown-line"><span>Wait · {selectedResult.provider.waitDays} days</span><strong>{fmt(selectedResult.waitScore)} × 40%</strong></div><div className="bar-track thick"><div style={{width:`${selectedResult.waitScore}%`,background:'#33a18b'}}/></div>
         <div className="calculation">{selectedResult.insuranceAccepted&&selectedResult.capacityAvailable?`${fmt(selectedResult.weightedTravel)} + ${fmt(selectedResult.weightedWait)} = ${fmt(selectedResult.score)}`:'Hard constraint → score = 0'}</div>
        </>:<div className="empty-breakdown">Select a provider on the map or in the ranking to see its score calculation.</div>}</div></div>:
       <div className="population-panel"><div className="population-metrics"><div><span>AVERAGE BEST-PROVIDER SCORE</span><strong>{fmt(currentSummary.average)}</strong><small className={deltaPopulation>0?'positive':deltaPopulation<0?'negative':''}>{deltaPopulation>0?'+':''}{fmt(deltaPopulation)} from baseline</small></div><div><span>PATIENTS WITH A VIABLE PROVIDER</span><strong>{currentSummary.viableCount}<small> / {currentSummary.total}</small></strong><small>Score ≥ {VIABLE_THRESHOLD}, eligible and with capacity</small></div></div><div className="pop-list-header"><span>PATIENT</span><span>BASELINE → SCENARIO</span></div>{population.map((p,i)=>{const before=bestScore(basePatients[i],baseProviders);const after=bestScore(p,clinics);return <div key={p.id} className="pop-row"><div><strong>{p.name}</strong><span>{p.area}</span></div><div className="pop-bars"><div className="comparison-track"><div className="baseline-bar" style={{width:`${before}%`}}/><div className="scenario-bar" style={{width:`${after}%`}}/></div><strong className={after>before?'positive':after<before?'negative':''}>{fmt(before)} <ArrowRight size={13}/> {fmt(after)}</strong></div></div>})}</div>}
     </div>
    </section>
   </div>
  </main>
 </div>;
}
