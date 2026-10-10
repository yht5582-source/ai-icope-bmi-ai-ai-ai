// Rule tests for the screening engine embedded in index.html.
// Run: node tests.cjs
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const m = html.match(/\/\*ENGINE-START\*\/([\s\S]*?)\/\*ENGINE-END\*\//);
if (!m) throw new Error('engine block not found');
const mod = { exports: {} };
new Function('module', m[1])(mod);
const NB = mod.exports;

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); pass++; console.log('  ✓ ' + name); }
  catch (e) { fail++; console.log('  ✗ ' + name + '\n    ' + e.message); }
}
// Complete MNA-SF answers that score full marks on A, C, D, E.
const FULL = { mnaA: 2, mnaC: 2, mnaD: 2, mnaE: 2 };
const ev = (a, p) => NB.evaluate(a, p || { age: 80, setting: '住院' });

console.log('Anthropometrics');
t('BMI from height and weight', () => assert.equal(NB.derive({ height: 160, weight: 51.2 }).bmi, 20));
t('legacy BMI used when no height', () => assert.equal(NB.derive({ bmiOnly: 19.4 }).bmi, 19.4));
t('3-month loss in kg and %', () => { const d = NB.derive({ weight: 47, wt3m: 50 }); assert.equal(d.loss3, 3); assert.equal(d.pct3, 6); });
t('weight gain gives negative loss', () => assert.equal(NB.derive({ weight: 52, wt3m: 50 }).loss3, -2));

console.log('ICOPE nutrition step 1');
t('loss >3 kg auto-answers question 1 yes', () => { const r = ev({ weight: 46.5, wt3m: 50 }); assert.equal(r.icope.q1, true); assert.equal(r.icope.q1auto, true); assert.equal(r.icope.nutri, true); });
t('loss of exactly 3 kg is not >3 kg', () => assert.equal(ev({ weight: 47, wt3m: 50, icopeApp: 'no' }).icope.nutri, false));
t('appetite loss alone is positive', () => assert.equal(ev({ icopeWt: 'no', icopeApp: 'yes' }).icope.nutri, true));
t('one answer missing and the other no → incomplete', () => assert.equal(ev({ icopeWt: 'no' }).icope.nutri, null));
t('other domains counted, unknown labels ignored', () => assert.equal(ev({ icopeWt: 'no', icopeApp: 'yes', icopeDomains: ['視力', '聽力', 'xx'] }).icope.count, 3));

console.log('MNA-SF (Kaiser 2009)');
t('full marks with BMI ≥23 → 14 normal', () => { const r = ev({ ...FULL, height: 160, weight: 60, wt3m: 60 }); assert.equal(r.mna.score, 14); assert.equal(r.mna.band, 'normal'); });
t('B auto: >3 kg → 0', () => assert.equal(ev({ weight: 46, wt3m: 50 }).mna.items.B, 0));
t('B auto: 1–3 kg → 2', () => { assert.equal(ev({ weight: 49, wt3m: 50 }).mna.items.B, 2); assert.equal(ev({ weight: 47, wt3m: 50 }).mna.items.B, 2); });
t('B auto: <1 kg or gain → 3', () => { assert.equal(ev({ weight: 49.5, wt3m: 50 }).mna.items.B, 3); assert.equal(ev({ weight: 52, wt3m: 50 }).mna.items.B, 3); });
t('B manual "does not know" → 1', () => assert.equal(ev({ mnaB: 1 }).mna.items.B, 1));
t('F1 bands 19 / 21 / 23', () => {
  const F = b => ev({ bmiOnly: b }).mna.items.F;
  assert.deepEqual([F(18.9), F(19), F(20.9), F(21), F(22.9), F(23)], [0, 1, 1, 2, 2, 3]);
});
t('F2 calf circumference when no BMI: <31 → 0, ≥31 → 3', () => { assert.equal(ev({ calf: 30.9 }).mna.items.F, 0); assert.equal(ev({ calf: 31 }).mna.items.F, 3); assert.equal(ev({ calf: 31 }).mna.src.F, 'F2'); });
t('BMI takes precedence over calf circumference', () => assert.equal(ev({ bmiOnly: 18, calf: 35 }).mna.items.F, 0));
t('bands: 12 normal, 11 risk, 8 risk, 7 malnourished', () => {
  const S = (a, c) => ev({ mnaA: a, mnaB: 3, mnaC: c, mnaD: 2, mnaE: 2, bmiOnly: 23 }).mna;
  assert.equal(S(2, 0).score, 12); assert.equal(S(2, 0).band, 'normal');
  assert.equal(S(1, 0).band, 'risk');
  const r8 = ev({ mnaA: 0, mnaB: 1, mnaC: 0, mnaD: 2, mnaE: 2, bmiOnly: 23 }).mna; assert.equal(r8.score, 8); assert.equal(r8.band, 'risk');
  const r7 = ev({ mnaA: 0, mnaB: 0, mnaC: 0, mnaD: 2, mnaE: 2, bmiOnly: 23 }).mna; assert.equal(r7.score, 7); assert.equal(r7.band, 'mal');
});
t('missing items reported, no score', () => { const r = ev({ mnaA: 2 }).mna; assert.equal(r.score, null); assert.deepEqual(r.missing, ['B', 'C', 'D', 'E', 'F']); });
t('invalid option value ignored (D only 0 or 2)', () => assert.equal(ev({ mnaD: 1 }).mna.items.D, null));

console.log('GLIM (Cederholm 2019)');
const ET = { intakePct: 40, intakeDur: '1to2w', glimInfl: 'none' };
t('weight loss 6% in 6 months + intake ≤50% >1 wk → stage 1', () => { const g = ev({ weight: 47, wt6m: 50, ...ET }).glim; assert.equal(g.dx, true); assert.equal(g.stage, 1); });
t('weight loss 11% → stage 2', () => assert.equal(ev({ weight: 44.5, wt6m: 50, ...ET }).glim.stage, 2));
t('weight loss exactly 5% does not meet phenotype', () => assert.equal(ev({ weight: 47.5, wt6m: 50, glimMuscle: 'none', bmiOnly: 22, ...ET }).glim.dx, false));
t('Asian BMI cut-off: age 69 BMI 18.4 meets, 18.5 does not', () => {
  assert.ok(ev({ bmiOnly: 18.4, ...ET }, { age: 69 }).glim.lowBMI);
  assert.ok(!ev({ bmiOnly: 18.5, ...ET }, { age: 69 }).glim.lowBMI);
});
t('Asian BMI cut-off: age 70 BMI 19.9 meets', () => assert.ok(ev({ bmiOnly: 19.9, ...ET }, { age: 70 }).glim.lowBMI));
t('BMI-only stage 2 is flagged', () => { const g = ev({ bmiOnly: 19, glimMuscle: 'none', ...ET }, { age: 80 }).glim; assert.equal(g.stage, 2); assert.ok(g.bmiOnlyStage); });
t('severe muscle deficit → stage 2, not BMI-only', () => { const g = ev({ bmiOnly: 19, glimMuscle: 'severe', ...ET }, { age: 80 }).glim; assert.equal(g.stage, 2); assert.ok(!g.bmiOnlyStage); });
t('intake ≤50% for ≤1 week is not enough', () => assert.equal(ev({ intakePct: 40, intakeDur: 'le1w' }).glim.intakeMet, false));
t('any reduction >2 weeks qualifies', () => assert.equal(ev({ intakePct: 90, intakeDur: 'gt2w' }).glim.intakeMet, true));
t('intake 60% for 1–2 weeks does not qualify', () => assert.equal(ev({ intakePct: 60, intakeDur: '1to2w' }).glim.intakeMet, false));
t('intake ≥100% → not reduced even without duration', () => assert.equal(ev({ intakePct: 100 }).glim.intakeMet, false));
t('inflammation alone is an etiologic criterion', () => assert.equal(ev({ weight: 47, wt6m: 50, glimInfl: 'acute' }).glim.dx, true));
t('phenotype present but etiology unknown → null', () => assert.equal(ev({ weight: 47, wt6m: 50 }).glim.dx, null));
t('no phenotype with everything evaluated → false', () => assert.equal(ev({ height: 160, weight: 56, wt6m: 56, glimMuscle: 'none' }).glim.dx, false));
t('muscle "not measured" does not block a negative result', () => assert.equal(ev({ height: 160, weight: 56, wt6m: 56 }).glim.dx, false));

console.log('Tier');
t('GLIM positive → mal even if MNA-SF normal', () => assert.equal(ev({ ...FULL, mnaB: 3, bmiOnly: 23, weight: 47, wt6m: 50, glimInfl: 'chronic' }).tier, 'mal'));
t('ICOPE positive without MNA-SF → risk', () => assert.equal(ev({ icopeWt: 'no', icopeApp: 'yes' }).tier, 'risk'));
t('ICOPE negative without MNA-SF → ok', () => assert.equal(ev({ icopeWt: 'no', icopeApp: 'no' }).tier, 'ok'));
t('nothing entered → na', () => assert.equal(ev({}).tier, 'na'));
t('old weighted score case (BMI 17, alb 3.0, −4 kg) is now malnourished', () => {
  const r = ev({ height: 160, weight: 43.5, wt3m: 47.5, albumin: 3.0, mnaA: 1, mnaC: 2, mnaD: 2, mnaE: 2, intakePct: 60, intakeDur: 'gt2w', glimInfl: 'none' }, { age: 76 });
  assert.equal(r.mna.score, 7); assert.equal(r.glim.dx, true); assert.equal(r.tier, 'mal');
});
t('albumin does not change the tier', () => {
  const base = { ...FULL, mnaB: 3, bmiOnly: 23 };
  assert.equal(ev({ ...base, albumin: 2.5 }).tier, ev(base).tier);
});

console.log('Suggestions and targets');
t('ONS advice only when intake criterion met and at risk', () => {
  const has = r => r.sugg.some(s => /ONS/.test(s.text));
  assert.ok(has(ev({ mnaA: 1, mnaB: 2, mnaC: 2, mnaD: 2, mnaE: 2, bmiOnly: 21, intakePct: 40, intakeDur: 'gt2w', glimInfl: 'none' })));
  const normal = ev({ ...FULL, mnaB: 3, bmiOnly: 23, intakePct: 40, intakeDur: 'gt2w', glimInfl: 'none' });
  assert.equal(normal.tier, 'ok'); assert.ok(!has(normal));
});
t('swallow concern suggests swallow assessment task', () => assert.ok(ev({ swallow: true }).sugg.some(s => s.task === '吞嚥評估')));
t('low albumin note cites ASPEN', () => assert.ok(ev({ albumin: 3.0 }).sugg.some(s => /ASPEN/.test(s.src))));
t('targets 30 kcal/kg and 1.0 g/kg', () => assert.deepEqual(ev({ weight: 50 }).targets, { kcal: 1500, protein: 50, obese: false }));
t('community at-risk case gets visit task', () => assert.ok(ev({ icopeApp: 'yes', icopeWt: 'no' }, { age: 80, setting: '社區' }).sugg.some(s => s.task === '社區訪視')));

console.log('Data handling');
t('nextId never reuses a number after deletion', () => {
  const ps = [{ id: 'P-41002' }];
  assert.equal(NB.nextId(ps, 'P'), 'P-41003');
  assert.equal(NB.nextId([], 'C'), 'C-41001');
  assert.equal(NB.nextId([{ id: 'C-41007' }, { id: 'P-41002' }], 'H'), 'H-41008');
});
t('latest() picks the newest date regardless of entry order', () => {
  const p = { assessments: [{ date: '2026-09-01', weight: 2 }, { date: '2026-06-01', weight: 1 }] };
  assert.equal(NB.latest(p).weight, 2);
  assert.deepEqual(NB.sorted(p).map(a => a.weight), [1, 2]);
});
t('legacy record migrates without the synthetic trend', () => {
  const p = NB.migrateLegacy({ id: 'P-41001', name: 'x', gender: '女', age: 76, setting: '住院', bmi: 20, albumin: 3.5, weightChange: -1, icope: 2, icopeDomains: ['營養狀況', '視力'], intake: 75, appetite: '略差', swallow: false, trend: { weight: [55] } });
  const a = p.assessments[0];
  assert.equal(a.bmiOnly, 20); assert.equal(a.legacy, true); assert.equal(a.icopeNutriFlag, true);
  assert.deepEqual(a.icopeDomains, ['視力']); assert.equal(a.trend, undefined); assert.equal(a.weight, undefined);
  assert.equal(ev(a).icope.nutri, true);
});
t('migrateAll de-duplicates colliding legacy IDs', () => {
  const out = NB.migrateAll([{ id: 'P-41002', name: 'a', setting: '住院' }, { id: 'P-41002', name: 'b', setting: '住院' }]);
  assert.notEqual(out[0].id, out[1].id);
});
t('esc() neutralises HTML', () => assert.equal(NB.esc('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;'));
t('CSV quotes commas and blocks formula injection', () => {
  assert.equal(NB.toCSV([['a,b', '=1+1', -3, '-2']]), '"a,b",\'=1+1,-3,-2');
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
