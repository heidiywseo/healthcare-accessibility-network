import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join,resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
const out=mkdtempSync(join(tmpdir(),'accesslab-network-'));
const result=spawnSync('tsc',['--target','es2020','--module','commonjs','--skipLibCheck','--outDir',out,'src/data/scenario.ts','src/model/accessibility.ts','src/model/network.ts'],{cwd:resolve('.'),encoding:'utf8'});
if(result.status!==0)throw new Error(result.stderr+'\n'+result.stdout);
const require=createRequire(import.meta.url);
const {patients,providers}=require(join(out,'data/scenario.js'));
const {allocateCare,COHORT_DEMAND,evaluateSites,chooseSite,proposedClinic}=require(join(out,'model/network.js'));
const base=allocateCare(patients,providers);

test('matching conserves counts and observes every capacity',()=>{
 assert.equal(base.served+base.unserved,base.demand);
 assert.equal(base.demand,Object.values(COHORT_DEMAND).reduce((a,b)=>a+b,0));
 for(const c of base.byProvider){assert.ok(c.assigned>=0);assert.ok(c.assigned<=c.capacity);}
 for(const c of base.byPatient){assert.ok(c.served>=0&&c.served<=c.demand);}
 assert.equal(base.assignments.reduce((n,a)=>n+a.count,0),base.served);
});
test('only viable patient-provider edges appear in a matching',()=>{
 const {scoreAccess}=require(join(out,'model/accessibility.js'));
 for(const a of base.assignments){const p=patients.find(p=>p.id===a.patientId),h=providers.find(h=>h.id===a.providerId);assert.equal(scoreAccess(p,h).viable,true);}
});
test('matching is deterministic for unchanged inputs',()=>assert.deepEqual(allocateCare(patients,providers),base));
test('no open slots produces no assignments',()=>{
 const r=allocateCare(patients,providers.map(p=>({...p,slots:0})));
 assert.equal(r.served,0); assert.equal(r.unserved,r.demand);
});
test('a new clinic cannot decrease maximum matched headcount',()=>{
 const a=allocateCare(patients,[...providers,proposedClinic({id:'extra',label:'Extra',location:patients[0].location})]);
 assert.ok(a.served>=base.served);
});
test('candidate evaluation examines each site and objective returns a candidate',()=>{
 const sites=evaluateSites(patients,providers);
 assert.equal(sites.length,10);
 for(const s of sites){assert.ok(s.allocation.served>=base.served);assert.ok(s.allocation.minimumCoverage>=0&&s.allocation.minimumCoverage<=1);}
 assert.ok(chooseSite(sites,'efficiency'));assert.ok(chooseSite(sites,'equity'));
});
test('no eligible provider means all demand unserved',()=>{
 const r=allocateCare(patients,providers.map(h=>({...h,plans:[]})));
 assert.equal(r.served,0);
});
test('patients cannot be double-counted across clinics',()=>{
 for(const p of base.byPatient){assert.equal(base.assignments.filter(a=>a.patientId===p.patientId).reduce((s,a)=>s+a.count,0),p.served);}
});
process.on('exit',()=>rmSync(out,{recursive:true,force:true}));
