// /tpx 체인 서브 에이전트의 모델 배분이 정의 파일과 스킬에 박혀 있는지 본다 (2026-10-06 사용자 — 토큰이 빨리 닳는다)
// effort 는 호출 때 못 정하고 .claude/agents 머리로만 정해진다. 산문 「Sonnet 으로」만 두면 다음 세션이 잊는다
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';

const AGENTS = new URL('../agents/', import.meta.url);
const SKILLS = new URL('../skills/', import.meta.url);

const 머리 = (name) => {
  const 자리 = new URL(`${name}.md`, AGENTS);
  assert.ok(existsSync(자리), `.claude/agents/${name}.md 가 없다`);
  const 글 = readFileSync(자리, 'utf8');
  const 덩이 = /^---\n([\s\S]*?)\n---/.exec(글);
  assert.ok(덩이, `${name}.md 에 머리(---) 가 없다`);
  return Object.fromEntries(
    덩이[1].split('\n').map((줄) => /^(\w+):\s*(.*)$/.exec(줄)).filter(Boolean).map((m) => [m[1], m[2].trim()]),
  );
};

// SKILL.md 와 references/*.md 를 이어 읽는다 — 절을 옮겨도 단언이 문다
const 스킬 = (name) => {
  const 폴더 = new URL(`${name}/references/`, SKILLS);
  const 참고 = existsSync(폴더) ? readdirSync(폴더).filter((f) => f.endsWith('.md')).sort() : [];
  return [
    readFileSync(new URL(`${name}/SKILL.md`, SKILLS), 'utf8'),
    ...참고.map((f) => readFileSync(new URL(`${name}/references/${f}`, SKILLS), 'utf8')),
  ].join('\n');
};

test('구현자 정의는 Sonnet · effort high 다', () => {
  const m = 머리('tpx-implementer');
  assert.equal(m.name, 'tpx-implementer');
  assert.equal(m.model, 'sonnet');
  assert.equal(m.effort, 'high');
});

test('계획 대조 검증자 정의는 Sonnet · effort medium 이고 고치는 도구가 없다', () => {
  const m = 머리('tpx-verifier');
  assert.equal(m.name, 'tpx-verifier');
  assert.equal(m.model, 'sonnet');
  assert.equal(m.effort, 'medium');
  assert.ok(m.tools, 'tools 를 적지 않으면 모든 도구를 받는다 — 읽기 전용이 산문으로만 남는다');
  // 허용 목록으로 본다 — 금지 목록이면 `*` · Agent(다른 에이전트를 띄워 고친다)를 넣어도 통과한다 (#164 검토 주의 1)
  assert.deepEqual(m.tools.split(/,\s*/).sort(), ['Glob', 'Grep', 'Read']);
});

test('tpx-impl 이 구현자 · 검증자를 정의 이름으로 부르고 보안 할 일은 Opus 로 돌린다', () => {
  const 글 = 스킬('tpx-impl');
  assert.match(글, /subagent_type: "tpx-implementer"/);
  assert.match(글, /subagent_type: "tpx-verifier"/);
  assert.match(글, /보안[\s\S]{0,120}model: "opus"/, '보안 · 비밀값 할 일을 Opus 로 돌린다는 줄이 없다');
  assert.doesNotMatch(글, /subagent_type: "general-purpose"` 로 발행한다\. \*\*읽기 전용/, '검증자가 아직 general-purpose 다');
  // 정의는 세션을 띄울 때 읽힌다 — 그 뒤에 생긴 정의는 그 세션이 못 찾는다 (#164 검토 주의 2)
  assert.match(글, /정의를 못 찾으면[\s\S]{0,160}model: "sonnet"/, '정의를 못 찾을 때 대신 낼 방법이 없다');
});

// 산문 줄이 같은 낱말을 받쳐 호출 블록을 Explore · haiku 로 바꿔도 초록이 되는 것을 막는다
const 펜스안 = (글) => [...글.matchAll(/```[^\n]*\n([\s\S]*?)\n```/g)].map((m) => m[1]).join('\n');

test('계획 검토 · 독립 검사 렌즈는 Opus 를 쓴다고 적혀 있다', () => {
  const 호출 = 펜스안(스킬('tpx-plan-review'));
  assert.match(호출, /Agent\(\{/, '대조군 — tpx-plan-review 코드 펜스 안에 호출 블록이 있어야 한다');
  assert.match(호출, /model: "opus"/, 'tpx-plan-review 호출 블록에 렌즈 모델(Opus) 줄이 없다');
  assert.match(스킬('tpx-review'), /model: "opus"/, 'tpx-review 에 렌즈 모델(Opus) 줄이 없다');
});

// Step 2 제목에 「묶음마다」가 이미 있다 — 2-C 절만 잘라 보지 않으면 단언이 항진명제가 된다
const 절2C = () => {
  const 글 = 스킬('tpx-impl');
  const 시작 = 글.indexOf('### 2-C.');
  assert.ok(시작 >= 0, 'tpx-impl 에 「### 2-C.」 절이 없다');
  const 끝 = 글.indexOf('\n## ', 시작);
  const 절 = 글.slice(시작, 끝 < 0 ? undefined : 끝);
  assert.doesNotMatch(절, /^## /m, '절 자르기가 다음 장까지 넘어갔다');
  assert.doesNotMatch(절, /Step 2\. 묶음마다/, '절 자르기에 Step 2 제목이 섞였다');
  return 절;
};

test('대조 검증자는 묶음마다 하나 낸다 — 판정은 할 일마다 커밋 해시와 함께 받는다', () => {
  assert.match(스킬('tpx-impl'), /## Step 2\. 묶음마다/, '대조군 — Step 2 제목에는 이미 「묶음마다」가 있어 절로 안 자르면 통과해 버린다');
  const 절 = 절2C();
  assert.match(절, /검증자[^\n]*묶음마다 하나/, '검증자를 묶음마다 하나 낸다는 줄이 없다');
  assert.match(절, /판정[^\n]*할 일마다[^\n]*커밋 해시/, '판정을 할 일마다 커밋 해시와 함께 받는다는 줄이 없다');
});

test('대조 검증 차이 파일 이름에 PR 번호와 묶음 번호가 들어가고 옛 이름이 없다', () => {
  const 절 = 절2C();
  assert.ok(절.includes('tpx-<PR 번호>-묶음<n>.diff'), '차이 파일 이름이 tpx-<PR 번호>-묶음<n>.diff 가 아니다');
  assert.doesNotMatch(절, /tpx-<할 일>\.diff/, '옛 차이 파일 이름(할 일마다)이 남아 있다');
});

test('대조 검증에서 DRIFT 는 그 할 일만 다시 발행하고 다시 검증한다', () => {
  assert.match(절2C(), /DRIFT[^\n]*그 할 일만[^\n]*재검증/, 'DRIFT 가 그 할 일만 재발행 · 재검증한다는 줄이 없다');
});

test('대조 검증 차이는 길면 경로만 넘기고 해시 없는 PASS 는 그 할 일만 검증자에게 다시 묻는다', () => {
  const 절 = 절2C();
  assert.ok(절.includes('길면 경로만 넘긴다'), '차이가 길면 경로만 넘긴다는 줄이 없다');
  assert.ok(!절.includes('프롬프트에도 붙인다'), '길 때도 프롬프트에 붙인다는 옛 줄이 남았다');
  assert.match(절, /해시 없는 PASS[^\n]*그 할 일만[^\n]*검증자에게 다시 묻는다/, '해시 없는 PASS 를 그 할 일만 다시 묻는다는 줄이 없다');
});

test('대조 검증 차이는 늘 파일로 떨구고 길면 경로만 넘긴다 — 두 줄이 같은 말을 한다', () => {
  const 절 = 절2C();
  assert.ok(절.includes('늘 파일로 떨구고 길면 경로만 넘긴다'), '차이를 늘 파일로 떨구고 길면 경로만 넘긴다는 줄이 없다');
  assert.ok(!절.includes('차이가 길면 작업방 밖에'), '길 때만 파일로 떨군다는 옛 줄이 남았다');
});

test('대조 검증자는 GREEN 커밋이 검사 파일을 고쳤으면 계획 「구현 중 바뀐 것」에 그 줄이 있는지 본다', () => {
  assert.match(절2C(), /GREEN 커밋이 검사 파일을 고쳤으면[^\n]*「구현 중 바뀐 것」[^\n]*검증자가 본다/, 'GREEN 에서 고친 검사 파일을 계획 기록과 대조한다는 줄이 없다');
});
