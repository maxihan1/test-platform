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
  for (const 금지 of ['Bash', 'Edit', 'Write', 'NotebookEdit']) {
    assert.ok(!m.tools.split(/,\s*/).includes(금지), `검증자 tools 에 ${금지} 가 있다`);
  }
});

test('tpx-impl 이 구현자 · 검증자를 정의 이름으로 부르고 보안 할 일은 Opus 로 돌린다', () => {
  const 글 = 스킬('tpx-impl');
  assert.match(글, /subagent_type: "tpx-implementer"/);
  assert.match(글, /subagent_type: "tpx-verifier"/);
  assert.match(글, /보안[\s\S]{0,120}model: "opus"/, '보안 · 비밀값 할 일을 Opus 로 돌린다는 줄이 없다');
  assert.doesNotMatch(글, /subagent_type: "general-purpose"` 로 발행한다\. \*\*읽기 전용/, '검증자가 아직 general-purpose 다');
});

test('계획 검토 · 독립 검사 렌즈는 Opus 를 쓴다고 적혀 있다', () => {
  for (const s of ['tpx-plan-review', 'tpx-review']) {
    assert.match(스킬(s), /model: "opus"/, `${s} 에 렌즈 모델(Opus) 줄이 없다`);
  }
});
