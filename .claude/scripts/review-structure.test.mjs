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
