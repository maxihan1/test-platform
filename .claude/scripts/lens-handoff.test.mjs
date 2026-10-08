// 「렌즈에 넘기는 것」 정본 소절과 차선 표가 체인 문서에서 한 곳만 규칙을 갖는지 지키는 검사 (review-structure 에서 나눠 옴)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { 절, 소절 } from './md-sections.mjs';

const ROOT = new URL('../../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
const TR = '.claude/skills/tpx-review/SKILL.md';
const SR = '.claude/skills/spec-review/SKILL.md';
const GH = '.claude/skills/spec-review/references/checklist-g-h.md';
const TPX = '.claude/skills/tpx/SKILL.md';
const 정본제목 = '### 렌즈에 넘기는 것 — 검사 묶음은 다시 안 돈다';
const 줄들 = (글) => 글.split('\n');

test('할 일 4 — 정본 소절이 Step 4 안에 있고 검사 묶음을 컨트롤러가 먼저 돌려 넘기게 적는다', () => {
  const 글 = read(TR);
  assert.equal(글.split(정본제목).length - 1, 1, '정본 소절 제목이 정확히 한 번이어야 한다');
  assert.ok(절(글, '## Step 4').includes(정본제목), '정본 소절이 Step 4 절 안에 없다');
  const 본 = 소절(글, 정본제목);
  assert.ok(본.length > 200, '대조군 — 소절이 비어 있다');
  for (const 낱말 of ['먼저', '로그 폴더:', 'HEAD', 'EXIT', 'DATABASE_URL']) {
    assert.ok(본.includes(낱말), `컨트롤러가 넘길 것 "${낱말}" 이 없다`);
  }
  for (const 낱말 of ['run local', 'node --test', 'npm test', 'test:changed']) {
    assert.ok(본.includes(낱말), `렌즈가 다시 안 돌릴 명령 "${낱말}" 이 없다`);
  }
  for (const 낱말 of ['지금 HEAD', 'EXIT=', '[check-stamp]', 'pre-push', 'CI', '미확인', '중대', 'G8', 'G9']) {
    assert.ok(본.includes(낱말), `렌즈가 확인하는 길 "${낱말}" 이 없다`);
  }
});

test('할 일 4 — 정본 소절의 부숴 보기는 첫 회차 렌즈 직접 · 재검사 회차 컨트롤러 결과 · 보안은 RED 근거', () => {
  const 본 = 소절(read(TR), 정본제목);
  assert.ok(본.length > 200, '대조군 — 소절이 비어 있다');
  for (const 낱말 of ['첫 회차', '최대 두', '임시 사본', '작업 폴더', '재검사 회차', '컨트롤러', '보안', '비밀값', '권한', 'RED 커밋']) {
    assert.ok(본.includes(낱말), `부숴 보기 규칙 "${낱말}" 이 없다`);
  }
});

test('할 일 4 — 다른 자리는 「렌즈에 넘기는 것」을 가리키기만 하고 규칙을 옮겨 적지 않는다', () => {
  const 줄 = (글, 표지) => 글.split('\n').find((l) => l.includes(표지)) ?? '';
  const 자리 = {
    'tpx-review Step 2': 절(read(TR), '## Step 2'),
    'spec-review 절차': 절(read(SR), '## 절차'),
    'G3 줄': 줄(read(GH), 'G3는 1회로 본다'),
    G8: 줄(read(GH), '| G8 |'),
    G9: 줄(read(GH), '| G9 |'),
  };
  for (const [이름, 본] of Object.entries(자리)) {
    assert.ok(본.length > 20, `대조군 — ${이름} 자리를 못 찾았다`);
    assert.ok(본.includes('렌즈에 넘기는 것'), `${이름} 이 「렌즈에 넘기는 것」을 안 가리킨다`);
    assert.ok(!본.includes('check-stamp.mjs find'), `${이름} 에 정본 규칙(find)을 옮겨 적었다`);
  }
  assert.ok(절(read(SR), '## 절차').includes('스스로 돌려도'), '사람이 직접 부르면 스스로 돌려도 된다는 줄이 빠졌다');
});

test('할 일 3 — 표지 인정은 렌즈가 넘겨받은 HEAD · EXIT 줄 · [check-stamp] 줄로 한다(표지 저장소는 안 읽는다, 문서 · 명세 차선은 check:spec EXIT=0 과 변경 상태 확인)', () => {
  const 본 = 소절(read(TR), 정본제목);
  assert.ok(본.length > 200, '대조군 — 소절이 비어 있다');
  for (const 낱말 of ['`git rev-parse HEAD`', '지금 HEAD', '`EXIT=`', '[check-stamp]', 'local 표지를 남겼다: ', '앞 커밋의 local 표지를 재사용했다', '40자', 'pre-push', 'CI', '사이에 커밋하면 다시 돈다']) {
    assert.ok(본.includes(낱말), `넘겨받은 결과로 인정하는 규칙 "${낱말}" 이 없다`);
  }
  for (const 낱말 of ['check-stamp.mjs find', 'reuse=', 'kinds=', 'delta=', 'stamp=']) {
    assert.ok(!본.includes(낱말), `렌즈가 표지 저장소를 읽는 옛 규칙 "${낱말}" 이 남았다`);
  }
  assert.ok(!본.includes('네 가지'), '넘길 것 개수를 손으로 적었다');
  const 스크립트 = read('.claude/scripts/check-stamp.mjs');
  assert.ok(스크립트.includes('표지를 남겼다: ${sha}') && 스크립트.includes('앞 커밋의 local 표지를 재사용했다'), '대조군 — check-stamp.mjs 의 출력 글자가 문서가 옮긴 글자와 달라졌다');
  const 차선 = 줄들(본).find((l) => l.includes('check:spec') && l.includes('EXIT=0')) ?? '';
  assert.ok(차선.includes('`docs`') && 차선.includes('`spec`') && 차선.includes('표지'), 'docs · spec 차선이 표지 대신 check:spec EXIT=0 을 넘긴다는 줄이 없다');
  assert.ok(차선.includes('status --porcelain') && 차선.includes('문서 자리'), 'docs · spec 차선이 변경 상태(status --porcelain)로 문서 자리 밖 경로를 본다는 말이 없다');
  const 요약 = 절(read(TR), '## Step 7');
  assert.ok(요약.length > 200 && 요약.includes('검사 묶음이 이 HEAD 에서 초록인지 모른다') && 요약.includes('💡'), 'Step 7 에 「초록인지 모른다」를 💡 줄에 싣는다는 말이 없다');
  const 훅행 = 소절(read('docs/HOOKS.md'), '### 검사 재사용').split('\n').find((l) => l.startsWith('| `find` 출력')) ?? '';
  assert.ok(훅행.length > 20, '대조군 — HOOKS find 출력 행을 못 찾았다');
  assert.ok(훅행.includes('훅만') && 훅행.includes('렌즈는 표지를 읽지 않는다') && !훅행.includes('훅 · 스킬'), `HOOKS find 출력 행이 렌즈는 표지를 안 읽는다고 적지 않는다: ${훅행}`);
});

test('할 일 9 — 인정이 안 되면 게이트 2 요약의 독립 중대이고 G3 · H1 체크리스트 항목이 아니다 · DB 없이 돌았으면 G3 미확인은 남는다 · G8 · G9 는 직접 판정', () => {
  const 본 = 소절(read(TR), 정본제목);
  const 미확인줄 = 줄들(본).filter((l) => l.includes('미확인'));
  assert.ok(미확인줄.length > 0, '대조군 — 미확인 줄이 있어야 한다');
  const 인정안 = 줄들(본).find((l) => l.includes('인정이 안')) ?? '';
  for (const 낱말 of ['게이트 2 요약', '독립 중대', '검사 묶음이 이 HEAD 에서 초록인지 모른다', '단위 테스트', 'E1']) {
    assert.ok(인정안.includes(낱말), `인정이 안 되면 줄에 "${낱말}" 이 없다: ${인정안}`);
  }
  assert.ok(!인정안.includes('G3') && !인정안.includes('H1'), '인정이 안 되면 미확인을 G3 · H1 체크리스트 항목으로 묶은 옛 문장이 남았다');
  assert.deepEqual(미확인줄.filter((l) => l.includes('G8') || l.includes('G9')), [], '미확인을 G8 · G9 에 묶은 옛 문장이 남았다');
  assert.ok(/G8 · G9[^\n]*직접/.test(본), 'G8 · G9 는 렌즈가 직접 부숴 판정한다는 말이 없다');
  const 디비 = 줄들(본).find((l) => l.includes('DATABASE_URL') && l.includes('미확인')) ?? '';
  assert.ok(디비.includes('G3'), 'DATABASE_URL 없이 돌았으면 G3 미확인이라는 줄이 없다');
});

test('할 일 7 — 다시 안 돈다 목록 아래에 부숴 보기 사본의 검사 파일은 node --test 로 돈다는 예외와 사본 자리가 있다', () => {
  const 본 = 소절(read(TR), 정본제목);
  const 예외 = 줄들(본).find((l) => l.includes('사본') && l.includes('node --test') && l.includes('검사 파일')) ?? '';
  assert.ok(예외, '부숴 보기 사본의 검사 파일을 node --test 로 돈다는 예외 줄이 없다');
  assert.ok(예외.includes('저장소 배치 그대로'), '사본이 저장소 배치 그대로 뜬다는 말이 없다');
  assert.ok(본.indexOf('다시 돌리지 않는다') >= 0, '대조군 — 다시 돌리지 않는다 문장이 있어야 한다');
  assert.ok(본.indexOf(예외) > 본.indexOf('다시 돌리지 않는다'), '예외가 다시 안 돈다 문장보다 앞에 있다');
  assert.ok(본.includes('${CLAUDE_JOB_DIR:-/tmp}'), '사본 자리 ${CLAUDE_JOB_DIR:-/tmp} 가 없다');
  assert.ok(!본.includes('(`/tmp` 아래)'), '/tmp 하나로만 적은 옛 사본 자리가 남았다');
});

test('할 일 3 — 표지를 읽는 규칙(check-stamp.mjs find · reuse=)은 체인 문서 어디에도 없다', () => {
  const 스킬들 = new URL('.claude/skills/', ROOT);
  const 문서들 = readdirSync(스킬들, { recursive: true })
    .filter((f) => f.endsWith('.md') && /^(tpx[^/]*|spec-review)\//.test(f));
  assert.ok(문서들.includes('tpx-review/SKILL.md') && 문서들.includes('spec-review/references/checklist-g-h.md'), '대조군 — 체인 문서를 재귀로 읽어야 한다');
  for (const f of 문서들) {
    const 글 = read(`.claude/skills/${f}`);
    assert.ok(!글.includes('check-stamp.mjs find') && !글.includes('reuse='), `${f} 에 표지를 읽는 규칙(find · reuse=)이 남았다`);
  }
});

test('할 일 8 — tpx 차선 표 · HOOKS 차선 표가 lane() 을 가리키고 DOC 표면 조건을 적는다', () => {
  const 본 = 절(read(TPX), '## 차선');
  const 행 = (글, 머리) => 글.split('\n').find((l) => l.startsWith(머리)) ?? '';
  const 대상 = [
    ['tpx spec 행', 행(본, '| `spec`')],
    ['tpx docs 행', 행(본, '| `docs`')],
    ['HOOKS docs 행', 행(소절(read('docs/HOOKS.md'), '### 차선 — 바뀐 만큼만'), '| `docs` |')],
  ];
  for (const [이름, 줄] of 대상) {
    assert.ok(줄.length > 20, `대조군 — ${이름} 을 못 찾았다`);
    assert.ok(줄.includes('`lane()`'), `${이름} 이 lane() 을 안 가리킨다: ${줄}`);
    assert.ok(줄.includes('`DOC`'), `${이름} 이 DOC 표면 조건을 안 적는다: ${줄}`);
  }
});

test('할 일 9 — tpx 차선 표 spec 행 · HOOKS 차선 표 spec 행은 명세 파일을 SPEC 표면으로 적는다(DOC 표면이 아니다)', () => {
  const 행 = (글, 머리) => 글.split('\n').find((l) => l.startsWith(머리)) ?? '';
  const 대상 = [
    ['tpx spec 행', 행(절(read(TPX), '## 차선'), '| `spec`')],
    ['HOOKS spec 행', 행(소절(read('docs/HOOKS.md'), '### 차선 — 바뀐 만큼만'), '| `spec` |')],
  ];
  for (const [이름, 줄] of 대상) {
    assert.ok(줄.length > 20, `대조군 — ${이름} 을 못 찾았다`);
    assert.ok(줄.includes('`SPEC` 표면'), `${이름} 이 명세 파일을 SPEC 표면이라 적지 않는다: ${줄}`);
  }
  const 문서뿐 = read('.claude/scripts/lane.mjs');
  assert.ok(문서뿐.includes("표면들[i] === 'SPEC'"), '대조군 — lane() 이 SPEC 표면을 따로 허용해야 한다');
});
