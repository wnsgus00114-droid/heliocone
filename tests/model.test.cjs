const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../model.js'), 'utf8');
function modelAt(iso) {
  const NativeDate = Date;
  class FrozenDate extends NativeDate {
    constructor(...args) { super(...(args.length ? args : [iso])); }
    static now() { return NativeDate.parse(iso); }
  }
  const ctx = vm.createContext({ Date: FrozenDate, Intl, module: { exports: {} } });
  vm.runInContext(source, ctx);
  return { ...ctx.module.exports, evaluate: code => vm.runInContext(code, ctx) };
}
test('report date follows Korea at midnight, independently of host timezone', () => {
  assert.equal(modelAt('2026-11-23T14:59:59Z').DEFAULT_SETTINGS.day, '2026-11-23');
  const model = modelAt('2026-11-23T15:00:00Z');
  assert.equal(model.DEFAULT_SETTINGS.day, '2026-11-24');
  assert.equal(model.evaluate('FIRST_DAY'), '2026-11-10');
  assert.equal(model.evaluate('timeStamp()'), '2026-11-24 00:00:00');
});
test('rolling demo window crosses month and year boundaries', () => {
  const model = modelAt('2026-12-31T15:00:00Z');
  assert.equal(model.DEFAULT_SETTINGS.day, '2027-01-01');
  assert.equal(model.evaluate('FIRST_DAY'), '2026-12-18');
  assert.equal(model.settingsError({...model.DEFAULT_SETTINGS, day:'2026-12-17'}).length > 0, true);
  assert.equal(model.settingsError({...model.DEFAULT_SETTINGS, day:'2027-01-02'}).length > 0, true);
});
test('weekly reports aggregate seven days and keep explicit missing data', () => {
  const model = modelAt('2026-11-23T08:00:00Z');
  const report = model.buildReport({...model.DEFAULT_SETTINGS, site:'all', type:'weekly'}, []);
  assert.equal(report.days.length, 7);
  assert.equal(report.days[0], '2026-11-17');
  assert.equal(report.rows.length, 168);
  assert.equal(report.bySite.find(s => s.site === 'B').held, 8);
  assert.equal(report.rows.filter(r => r.site === 'B' && r.day === '2026-11-23').every(r => r.observed === null && r.predicted === null), true);
  assert.match(report.timeZoneLabel, /KST/);
});
test('mandatory summary and reception data remain when optional sections are off', () => {
  const model = modelAt('2026-11-23T08:00:00Z');
  const report = model.buildReport({...model.DEFAULT_SETTINGS, site:'all', trend:false, inspection:false}, []);
  assert.equal(report.bySite.length, 3);
  assert.equal(report.received, 15);
  assert.equal(report.total, 24);
  assert.equal(report.rate, 63);
  assert.match(report.summary, /11.23/);
});
test('CSV uses report timezone while old saved reports retain UTC+8', () => {
  const model = modelAt('2026-11-23T08:00:00Z');
  const report = model.buildReport({...model.DEFAULT_SETTINGS, site:'C'}, []);
  assert.match(model.csvText(report), /KST/);
  const legacy = JSON.parse(JSON.stringify(report));
  delete legacy.timeZoneLabel;
  assert.match(model.csvText(legacy), /UTC\+8/);
});
test('handoff notes are included only in selected period and CSV escapes formulas', () => {
  const model = modelAt('2026-11-23T08:00:00Z');
  const event = {day:'2026-11-23', owner:'운영 담당 B', status:'점검 기록 완료', checks:[true,true,true], memo:'=HYPERLINK("unsafe")', nextCheck:'다음 수신 확인', at:'2026-11-23 17:00:00', timeZoneLabel:'KST'};
  const report = model.buildReport({...model.DEFAULT_SETTINGS, site:'B'}, [event, {...event, day:'2026-11-22'}]);
  assert.equal(report.checks.length, 1);
  assert.match(model.csvText(report), /'=HYPERLINK/);
  assert.match(model.csvText(report), /다음 수신 확인/);
});
