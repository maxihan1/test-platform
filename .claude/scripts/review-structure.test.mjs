// 검토 구조 정리(PR #179)가 계획 검토를 저장소 안 기준으로 옮긴 자리를 지키는 검사.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const ROOT = new URL('../../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
const PR = '.claude/skills/tpx-plan-review/SKILL.md';
const LENSES = '.claude/skills/tpx-plan-review/references/lenses.md';

// `## 제목` 부터 다음 `## ` 제목 전까지
const 절 = (글, 제목) => {
  const 시작 = 글.indexOf(제목);
  if (시작 < 0) return '';
  const 나머지 = 글.slice(시작 + 제목.length);
  const 끝 = 나머지.search(/\n## /);
  return 끝 < 0 ? 나머지 : 나머지.slice(0, 끝);
};

test('할 일 1 — 계획 검토 SKILL.md 가 gstack 렌즈 스킬을 부르지 않는다', () => {
  const 본 = read(PR);
  assert.ok(본.includes('## Step 1'), '대조군 — 읽은 파일이 계획 검토 SKILL.md 여야 한다');
  for (const 낱말 of ['plan-eng-review', 'plan-ceo-review', 'plan-design-review', 'gstack:']) {
    assert.ok(!본.includes(낱말), `"${낱말}" 이 남았다`);
  }
});

test('할 일 1 — lenses.md 에 공학 · 제품 · 화면 세 절과 번호 붙은 항목이 있다', () => {
  assert.ok(existsSync(new URL(LENSES, ROOT)), 'lenses.md 가 없다');
  const 글 = read(LENSES);
  for (const [제목, 머리] of [['## 공학', 'E'], ['## 제품', 'P'], ['## 화면', 'D']]) {
    const 본 = 절(글, 제목);
    assert.ok(본, `"${제목}" 절이 없다`);
    assert.match(본, new RegExp(`(^|\\n)\\s*[-*]?\\s*\\*{0,2}${머리}1\\b`), `${제목} 절에 ${머리}1 항목이 없다`);
  }
});

test('할 일 1 — Step 1 표가 등급마다 lenses.md 의 세 절을 가리킨다', () => {
  const 표 = 절(read(PR), '## Step 1');
  assert.ok(표, '대조군 — Step 1 절이 있어야 한다');
  const 행 = (등급) => 표.split('\n').find((l) => new RegExp(`\\|\\s*\\*{0,2}${등급}\\*{0,2}\\s*\\|`).test(l)) ?? '';
  assert.match(행(2), /공학/, '2등급 행이 공학 절을 안 가리킨다');
  assert.match(행(3), /공학/, '3등급 행이 공학 절을 안 가리킨다');
  assert.match(행(3), /제품/, '3등급 행이 제품 절을 안 가리킨다');
  assert.ok(표.includes('화면'), '화면을 건드릴 때를 안 적었다');
  assert.ok(read(PR).includes('references/lenses.md'), 'SKILL.md 가 lenses.md 를 가리키지 않는다');
});

test('할 일 1 — 렌즈를 general-purpose · Opus 서브 에이전트로 내고 프롬프트에 위치 셋을 싣는다', () => {
  const 본 = read(PR);
  assert.match(본, /subagent_type: "general-purpose"/, 'general-purpose 서브 에이전트로 낸다는 줄이 없다');
  assert.match(본, /model: "opus"/, 'model: "opus" 줄이 없다');
  const 호출 = 절(본, '## Step 2');
  assert.ok(호출, '대조군 — Step 2 절이 있어야 한다');
  assert.ok(호출.includes('lenses.md'), '프롬프트에 lenses.md 절 위치가 없다');
  assert.ok(호출.includes('계획 파일'), '프롬프트에 계획 파일 경로가 없다');
  assert.ok(호출.includes('작업방 절대경로'), '프롬프트에 작업방 절대경로가 없다');
});

test('할 일 1 — tpx 등급표 「계획 검토」 행이 gstack 슬래시 렌즈를 부르지 않는다', () => {
  const 행 = read('.claude/skills/tpx/SKILL.md').split('\n').find((l) => l.startsWith('| 계획 검토'));
  assert.ok(행, '대조군 — 계획 검토 행이 있어야 한다');
  assert.ok(!행.includes('/plan-eng-review') && !행.includes('/plan-ceo-review'), `gstack 렌즈가 남았다: ${행}`);
  assert.ok(행.includes('공학 렌즈') && 행.includes('제품 렌즈'), `공학 · 제품 렌즈 표기가 없다: ${행}`);
});

const TR = '.claude/skills/tpx-review/SKILL.md';
const SR = '.claude/skills/spec-review/SKILL.md';
const GH = '.claude/skills/spec-review/references/checklist-g-h.md';
const 정본제목 = '### 렌즈에 넘기는 것 — 검사 묶음은 다시 안 돈다';

// 제목과 같은 깊이 이하의 다음 제목 전까지 (코드 펜스 안의 `#` 줄은 제목이 아니다)
const 소절 = (글, 제목) => {
  const 시작 = 글.indexOf(제목);
  if (시작 < 0) return '';
  const 깊이 = 제목.match(/^#+/)[0].length;
  const 제목줄 = new RegExp(`^#{1,${깊이}} `);
  const 모은 = [];
  let 펜스 = false;
  for (const 줄 of 글.slice(시작 + 제목.length).split('\n')) {
    if (/^```/.test(줄)) 펜스 = !펜스;
    if (!펜스 && 제목줄.test(줄)) break;
    모은.push(줄);
  }
  return 모은.join('\n');
};

test('할 일 4 — 소절() 헬퍼가 같은 깊이 제목에서 자르고 더 깊은 제목은 넘긴다', () => {
  const 본 = 소절('## a\n### b\n본문\n#### c\n깊다\n```\n### 펜스\n```\n### d\n다음\n## e', '### b');
  assert.ok(본.includes('깊다') && 본.includes('펜스'), '더 깊은 제목이나 펜스 안에서 잘렸다');
  assert.ok(!본.includes('다음'), '같은 깊이 다음 제목을 넘어갔다');
});

test('할 일 4 — Step 2 가 code-review args 를 확인된 글자 그대로 적는다', () => {
  const 본 = 절(read(TR), '## Step 2');
  assert.ok(본.includes('| **0** |'), '대조군 — Step 2 표가 있어야 한다');
  assert.ok(본.includes('low origin/main...HEAD in <작업방 절대경로>'), '0~1등급 args 가 없다');
  assert.ok(본.includes('medium origin/main...HEAD in <작업방 절대경로>'), '2~3등급 args 가 없다');
  assert.ok(!본.includes('--max-findings'), '--max-findings 를 고정하면 한 번 준 값이 남는다');
});

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
  for (const 낱말 of ['check-stamp.mjs find', 'stamp=', 'kinds=', '미확인', '중대', 'G8', 'G9']) {
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

test('할 일 4 — Step 3 이 세 마디를 자기 안에 적고 /tpx-plan-review 를 가리키지 않는다', () => {
  const 본 = 절(read(TR), '## Step 3');
  assert.ok(본.includes('작업 디렉터리'), '대조군 — Step 3 절이 있어야 한다');
  assert.ok(!본.includes('tpx-plan-review'), '/tpx-plan-review 를 아직 가리킨다');
  for (const 마디 of ['비대화형으로 한 번만', '고치지 말고', '질문하지 말고', '루프를 돌리지 마라']) {
    assert.ok(본.includes(마디), `"${마디}" 가 Step 3 에 없다`);
  }
});
