// 컨텍스트 줄이기(PR #177)가 옮긴 자리를 가리키는 곳이 어긋나지 않게 지키는 검사.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ROOT = new URL('../../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
// `apps/admin/CLAUDE.md` 가 아닌 맨 `CLAUDE.md` 언급을 찾는다
const 맨CLAUDE = /(?<!apps\/admin\/)CLAUDE\.md/;

test('할 일 1 — fixture 접두사 목록이 apps/admin/CLAUDE.md 로 옮겨졌다', () => {
  const 루트 = read('CLAUDE.md');
  const 하위 = read('apps/admin/CLAUDE.md');
  assert.ok(하위.includes('`XWA`('), '대조군 — 옮긴 쪽에 접두사 줄이 있어야 한다');
  assert.ok(!루트.includes('`XWA`('), '루트 CLAUDE.md 에 접두사 등록 줄이 남아 있다');
  assert.ok(루트.includes('apps/admin/CLAUDE.md'), '루트가 옮긴 자리를 안 가리킨다');
  assert.ok(하위.includes('새 접두사를 쓰면 이 줄에 적는다'), '하위 파일에 등록 규칙이 없다');
});

test('할 일 1 — spec-review G 체크리스트가 접두사 정본으로 apps/admin/CLAUDE.md 를 가리킨다', () => {
  const g = read('.claude/skills/spec-review/references/checklist-g-h.md');
  assert.ok(g.includes('G3는 1회로 본다'), '대조군 — 찾는 줄이 실제로 있어야 한다');
  assert.ok(g.includes('apps/admin/CLAUDE.md'), 'apps/admin/CLAUDE.md 를 안 가리킨다');
  assert.doesNotMatch(g, 맨CLAUDE, '옛 루트 CLAUDE.md §3 를 아직 가리킨다');
});

test('할 일 1 — SETUP 의 fixture 줄이 apps/admin/CLAUDE.md 를 가리킨다', () => {
  const 줄 = read('docs/SETUP.md').split('\n').find((l) => l.includes('검사 전에 치운다'));
  assert.ok(줄, '대조군 — 찾는 줄이 실제로 있어야 한다');
  assert.ok(줄.includes('apps/admin/CLAUDE.md'), 'apps/admin/CLAUDE.md 를 안 가리킨다');
  assert.doesNotMatch(줄, 맨CLAUDE, '옛 루트 CLAUDE.md 를 아직 가리킨다');
});

// `## 제목` 부터 같은 깊이 이하의 다음 제목 전까지를 잘라 온다
const 절 = (text, 제목) => {
  const 시작 = text.indexOf(제목);
  assert.ok(시작 >= 0, `대조군 — "${제목}" 절이 있어야 한다`);
  const 깊이 = 제목.match(/^#+/)[0].length;
  const 나머지 = text.slice(시작 + 제목.length);
  const 끝 = 나머지.search(new RegExp(`^#{1,${깊이}} `, 'm'));
  return 끝 < 0 ? 나머지 : 나머지.slice(0, 끝);
};

test('할 일 2 — tpx 선행 읽기가 본문 대신 위치와 절 제목을 넘긴다', () => {
  const 본 = 절(read('.claude/skills/tpx/SKILL.md'), '## 선행 읽기 — 여기서 한 번만 읽는다');
  assert.ok(본.includes('`파일:줄`'), '파일:줄 을 넘긴다는 말이 없다');
  assert.ok(본.includes('절 제목'), '절 제목을 함께 넘긴다는 말이 없다');
  assert.match(본, /grep[^\n]*다시 찾/, '받는 쪽이 절 제목을 grep 해 다시 찾는다는 말이 없다');
  assert.ok(본.includes('줄 범위'), '줄 범위만 연다는 말이 없다');
  assert.match(본, /progress[^\n]*마지막 항목 하나/, 'progress 는 마지막 항목 하나만 읽는다는 말이 없다');
  assert.doesNotMatch(본, /본문을 붙여 보낸다/, '옛 「본문을 붙여 보낸다」가 남았다');
});

test('할 일 2 — tpx-impl 이 계획 파일 경로 + 할 일 번호를 구현자와 검증자에게 넘긴다', () => {
  const 본 = read('.claude/skills/tpx-impl/SKILL.md');
  const 구현 = 절(본, '### 2-A. 구현자 병렬 발행');
  const 검증 = 절(본, '### 2-C. 계획 대조 검증');
  assert.ok(구현.includes('계획 파일 경로 + 할 일 번호'), '2-A 가 계획 경로 + 할 일 번호를 안 넘긴다');
  assert.ok(검증.includes('계획 파일 경로 + 할 일 번호'), '2-C 가 계획 경로 + 할 일 번호를 안 넘긴다');
  assert.doesNotMatch(본, /선행 읽기 본문을 인라인으로 붙인다/, '옛 인라인 붙이기가 남았다');
});

test('할 일 2 — tpx-impl 선행 읽기가 위치 넘기기이고 CLAUDE.md §3 을 싣지 않는다', () => {
  const 본 = 절(read('.claude/skills/tpx-impl/SKILL.md'), '## 선행 읽기');
  assert.ok(본.includes('파일:줄') && 본.includes('절 제목'), '위치와 절 제목을 넘긴다는 말이 없다');
  assert.doesNotMatch(본, /CLAUDE\.md §3/, '보조 에이전트가 루트 CLAUDE.md 를 받으므로 §3 은 싣지 않는다');
});

test('할 일 2 — tpx-review 선행 읽기가 렌즈에 위치를 넘긴다', () => {
  const 본 = 절(read('.claude/skills/tpx-review/SKILL.md'), '## 선행 읽기');
  assert.ok(본.includes('파일:줄') && 본.includes('절 제목'), '렌즈에 위치와 절 제목을 넘긴다는 말이 없다');
  assert.doesNotMatch(본, /사본을 렌즈 프롬프트에 붙인다/, '옛 사본 붙이기가 남았다');
});

test('할 일 2 — tpx-spec Step 1 이 장 안에서 절 단위로 읽고, 1000줄 엣지는 없다', () => {
  const 스킬 = read('.claude/skills/tpx-spec/SKILL.md');
  const 본 = 절(스킬, '## Step 1. 읽을 장을 좁힌다');
  assert.ok(본.includes('절 단위'), '장 안에서 절 단위로 읽는다는 말이 없다');
  assert.match(본, /읽은 절[^\n]*줄 수/, 'PR 코멘트에 읽은 절 · 줄 수를 적는다는 말이 없다');
  assert.doesNotMatch(스킬, /1000줄/, '옛 「1000줄」 엣지가 남았다');
});

test('할 일 2 — tpx-impl · tpx-review 는 위치만 넘겨도 환경 값을 프롬프트에 그대로 싣는다', () => {
  for (const s of ['tpx-impl', 'tpx-review']) {
    const 본 = 절(read(`.claude/skills/${s}/SKILL.md`), '## 선행 읽기');
    assert.ok(본.includes('환경 값'), `${s} 에 환경 값 문장이 없다`);
    assert.ok(본.includes('DATABASE_URL') && 본.includes('작업방 절대경로'), `${s} 가 DATABASE_URL · 작업방 절대경로를 안 든다`);
    assert.match(본, /그대로 (싣|넣)/, `${s} 가 환경 값을 그대로 싣는다고 안 적었다`);
  }
});

test('할 일 2 — 에이전트 정의는 프롬프트와 그것이 가리킨 줄을 정본으로 본다', () => {
  for (const f of ['tpx-implementer', 'tpx-verifier']) {
    const 본 = read(`.claude/agents/${f}.md`);
    assert.ok(본.includes('프롬프트와 그것이 가리킨 줄이 정본'), `${f} 가 위치 넘기기에 맞게 안 고쳐졌다`);
  }
});
