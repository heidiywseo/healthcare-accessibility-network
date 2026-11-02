import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
const out = mkdtempSync(join(tmpdir(), 'accesslab-'));
const result = spawnSync('tsc', ['--target','es2020','--module','commonjs','--skipLibCheck','--outDir',out,'src/data/scenario.ts','src/model/accessibility.ts'], {cwd:resolve('.'),encoding:'utf8'});
if (result.status !== 0) throw new Error(result.stderr + '\n' + result.stdout);
const require = createRequire(import.meta.url);
const {patients,providers} = require(join(out,'data/scenario.js'));
const {scoreAccess,rankProviders,summaryForPopulation,estimateTravelMinutes} = require(join(out,'model/accessibility.js'));

test('insurance mismatch gates score to zero',()=>{
  const result = scoreAccess(patients[0],providers.find(p=>p.id==='y'));
  assert.equal(result.insuranceAccepted,false);
  assert.equal(result.score,0);
});
test('switching to accepted insurance can restore accessibility',()=>{
  const p={...patients[0],insurance:'Plan B'};
  assert.ok(scoreAccess(p,providers.find(x=>x.id==='y')).score>0);
});
test('zero capacity gates score to zero',()=>{
  assert.equal(scoreAccess(patients[0],{...providers[0],slots:0}).score,0);
});
test('reducing wait time cannot lower score',()=>{
  const r1=scoreAccess(patients[0],providers[0]);
  const r2=scoreAccess(patients[0],{...providers[0],waitDays:0});
  assert.ok(r2.score>=r1.score);
});
test('same-location car travel is faster than transit',()=>{
  const p=patients[0];const c=providers[0];
  assert.ok(estimateTravelMinutes({...p,transport:'Car'},c)<estimateTravelMinutes({...p,transport:'Transit'},c));
});
test('adding a fully compatible nearby clinic cannot decrease best score',()=>{
  const p=patients[0];const extra={id:'new',name:'new',area:'new',location:p.location,plans:[p.insurance],waitDays:0,slots:10};
  assert.ok(rankProviders(p,[...providers,extra])[0].score>=rankProviders(p,providers)[0].score);
});
test('population metrics stay within score and patient bounds',()=>{
  const s=summaryForPopulation(patients,providers);
  assert.ok(s.average>=0&&s.average<=100);
  assert.ok(s.viableCount>=0&&s.viableCount<=patients.length);
});
test('scores stay within 0-100 for all initial patient-provider pairs',()=>{
 for(const p of patients)for(const c of providers){const s=scoreAccess(p,c).score;assert.ok(s>=0&&s<=100);}
});
process.on('exit',()=>rmSync(out,{recursive:true,force:true}));
