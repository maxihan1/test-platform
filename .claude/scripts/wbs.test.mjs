// wbs.mjs 가 docs/wbs.md 를 읽어 영역·기능·태스크로 펴는지 본다
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseWbs, checkSync, renderProgress } from './wbs.mjs';

test('진행판 템플릿의 데이터 자리에 JSON 을 넣고 </ 를 막는다', () => {
  const html = renderProgress({ t: '</script><b>' }, '<script>const DATA = /*__DATA__*/null;</script>');
  assert.equal(html, '<script>const DATA = {"t":"<\\/script><b>"};</script>');
});

test('템플릿에 데이터 자리가 없으면 거부한다', () => {
  assert.throws(() => renderProgress({}, '<html></html>'), /데이터 자리/);
});

const 표본 = `# WBS

## 안내
태스크가 아닌 글은 영역 밖에 있어도 된다.

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

test('영역 제목을 잘못 쳐서 영역 밖이 된 태스크는 조용히 빠지지 않고 실패한다', () => {
  assert.throws(() => parseWbs('## CAT - 카탈로그\n### F1\n- [x] `CAT-F1-01` 빠질 뻔\n'), /3행.*영역 밖/);
});

test('대문자 [X] 와 윈도 줄바꿈도 받는다', () => {
  const [a] = parseWbs('## CAT — 카탈로그\r\n### F1\r\n- [X] `CAT-F1-01` 스캐너\r\n  - 근거 PR #1 · 2026-09-16\r\n');
  assert.deepEqual(a.features[0].tasks[0], { id: 'CAT-F1-01', title: '스캐너', done: true, pr: 1, evidence: 'PR #1', date: '2026-09-16' });
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

test('② 추적 영역의 [x] PR 이 WORKSTREAMS 에 안 적혀 있다', () => {
  const errs = checkSync(wbs동기, '', ['REV']);
  assert.ok(errs.some((e) => e.includes('REV-F1-01') && e.includes('PR #79')));
  assert.ok(!errs.some((e) => e.includes('HAR-F1-01')), '추적 영역 밖은 보지 않는다');
});

test('② 명세 PR 처럼 완료 표시 없이 제목에만 적혀 있어도 통과한다', () => {
  const errs = checkSync(wbs동기, '## 📐 역방향 — 명세 섰다(2026-09-25, PR #79)\n', ['REV']);
  assert.ok(!errs.some((e) => e.includes('REV-F1-01')));
});

test('② 색 코드(#79693A)는 PR 번호로 세지 않는다', () => {
  const errs = checkSync(wbs동기, '색은 `#79693A` 와 `#79` 가 아니라 `#79FFFF`\n'.replace('`#79` 가 아니라 ', ''), ['REV']);
  assert.ok(errs.some((e) => e.includes('REV-F1-01')));
});

test('③ [x] 인데 근거 줄이 없다', () => {
  const errs = checkSync(wbs동기, '- ✅ PR #79\n', ['REV']);
  assert.ok(errs.some((e) => e.includes('REV-F1-02') && e.includes('근거')));
});

test('ID 가 겹치면 잡는다', () => {
  const errs = checkSync(wbs동기 + '### 또\n- [ ] `HAR-F1-01` 겹침\n', '- ✅ PR #79\n', ['REV']);
  assert.ok(errs.some((e) => e.includes('HAR-F1-01') && e.includes('겹')));
});
