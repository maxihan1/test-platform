// wbs.mjs 가 docs/wbs.md 를 읽어 영역·기능·태스크로 펴는지 본다
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseWbs, checkSync } from './wbs.mjs';

const 표본 = `# WBS

## 다음 수
- [ ] \`CAT-F1-99\` 영역 밖이 아니라 무시되는 절의 줄

## CAT — 카탈로그
### F1 스캐너 · Phase 1
**무엇** 케이스 파일을 읽어 목록을 만든다.
- [x] \`CAT-F1-01\` 스캐너를 만든다
  - 근거 PR #1 · 2026-09-16
- [ ] \`CAT-F1-02\` 중복을 잡는다

### F2 검사기
- [x] \`CAT-F2-01\` K 규칙
  - 근거 PR #12 · 2026-09-18
`;

test('영역·기능·무엇·태스크를 편다', () => {
  const areas = parseWbs(표본);
  assert.equal(areas.length, 1);
  const [a] = areas;
  assert.deepEqual([a.key, a.name], ['CAT', '카탈로그']);
  assert.deepEqual(a.features.map((f) => [f.name, f.phase]), [['F1 스캐너', 'Phase 1'], ['F2 검사기', '']]);
  assert.equal(a.features[0].what, '케이스 파일을 읽어 목록을 만든다.');
  assert.deepEqual(a.features[0].tasks, [
    { id: 'CAT-F1-01', title: '스캐너를 만든다', done: true, pr: 1, evidence: 'PR #1', date: '2026-09-16' },
    { id: 'CAT-F1-02', title: '중복을 잡는다', done: false, pr: null, evidence: null, date: null },
  ]);
});

test('영역이 아닌 ## 절 아래 태스크 줄은 세지 않는다', () => {
  const ids = parseWbs(표본).flatMap((a) => a.features.flatMap((f) => f.tasks.map((t) => t.id)));
  assert.ok(!ids.includes('CAT-F1-99'));
});

test('기능 제목 없이 영역 바로 아래 온 태스크는 거부한다', () => {
  assert.throws(() => parseWbs('## CAT — 카탈로그\n- [ ] `CAT-F1-01` 떠돈다\n'), /기능 제목 밖/);
});

const wbs동기 = `## REV — 역방향
### 서버
- [x] \`REV-F1-01\` 통로
  - 근거 PR #79 · 2026-09-26
- [x] \`REV-F1-02\` 근거 없는 완료
- [ ] \`REV-F1-03\` 남은 것

## HAR — 개발 체계
### 체인
- [x] \`HAR-F1-01\` 체인
  - 근거 PR #15 · 2026-09-18
`;

test('어긋남이 없으면 빈 목록', () => {
  const ws = '- **WS-작성 ① — 반영 완료 (2026-09-26, PR #79).**\n';
  const wbs = wbs동기.replace('- [x] `REV-F1-02` 근거 없는 완료\n', '');
  assert.deepEqual(checkSync(wbs, ws, ['REV']), []);
});

test('① WORKSTREAMS 에서 끝났는데 wbs 에 [x] 근거가 없다', () => {
  const ws = '1. ✅ **계약 (PR #79, 2026-09-26)**\n2. ✅ **러너 (PR #100, 2026-09-28)**\n3. **서버** — PR #200 뒤\n';
  const errs = checkSync(wbs동기, ws, ['REV']);
  assert.ok(errs.some((e) => e.includes('PR #100') && e.includes('WORKSTREAMS')));
  assert.ok(!errs.some((e) => e.includes('PR #200')), '완료 표시 없는 줄의 PR 은 보지 않는다');
});

test('② 추적 영역의 [x] 가 WORKSTREAMS 완료 줄에 없다', () => {
  const errs = checkSync(wbs동기, '', ['REV']);
  assert.ok(errs.some((e) => e.includes('REV-F1-01') && e.includes('PR #79')));
  assert.ok(!errs.some((e) => e.includes('HAR-F1-01')), '추적 영역 밖은 보지 않는다');
});

test('③ [x] 인데 근거 줄이 없다', () => {
  const errs = checkSync(wbs동기, '- ✅ PR #79\n', ['REV']);
  assert.ok(errs.some((e) => e.includes('REV-F1-02') && e.includes('근거')));
});

test('ID 가 겹치면 잡는다', () => {
  const errs = checkSync(wbs동기 + '### 또\n- [ ] `HAR-F1-01` 겹침\n', '- ✅ PR #79\n', ['REV']);
  assert.ok(errs.some((e) => e.includes('HAR-F1-01') && e.includes('겹')));
});
