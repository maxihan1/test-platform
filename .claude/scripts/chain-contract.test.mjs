// 체인 스킬 문서 자체를 검사한다. 산문으로만 적힌 규칙은 조용히 썩는다.
// 여기서 막는 넷은 전부 2026-09-18 실측에서 나온 것이다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';

const DIR = new URL('../skills/', import.meta.url);
const STEP_SKILLS = ['tp-start', 'tp-spec', 'tp-plan', 'tp-plan-review', 'tp-impl', 'tp-review', 'tp-merge'];
const read = (name) => readFileSync(new URL(`${name}/SKILL.md`, DIR), 'utf8');

// 산문 속 언급과 실제로 돌릴 명령을 가른다. ``` 울타리 안만 실행문으로 본다 —
// 「이 스킬에서 절대 부르지 않는다」 같은 금지 문장이 위반으로 잡히던 것을 막는다
const codeOf = (name) =>
  [...read(name).matchAll(/```[a-z]*\n([\s\S]*?)```/g)].map((m) => m[1]).join('\n');

test('일곱 단계 스킬과 컨트롤러가 전부 실재한다 (공허한 통과 방지)', () => {
  const have = readdirSync(new URL('.', DIR));
  for (const s of ['tp', ...STEP_SKILLS]) {
    assert.ok(have.includes(s), `${s} 스킬 폴더가 없다`);
    assert.ok(existsSync(new URL(`${s}/SKILL.md`, DIR)), `${s}/SKILL.md 가 없다`);
  }
});

test('컨트롤러가 가리키는 하위 스킬이 전부 실재한다', () => {
  const tp = read('tp');
  for (const s of STEP_SKILLS) {
    assert.ok(tp.includes(`../${s}/SKILL.md`), `컨트롤러가 ${s} 를 안 가리킨다`);
  }
});

// --- 지적 1. 순서 드리프트 ---
test('초안 PR 을 파일 수정보다 먼저 연다고 적혀 있다', () => {
  const start = read('tp-start');
  assert.match(start, /파일을 하나라도 고치기 전에/, 'tp-start 에 순서 못박기가 없다');
  assert.match(read('tp'), /A-1\. 순서 강제/, '컨트롤러에 순서 강제 절이 없다');
});

// --- pr-draft-guard. 작업 중 병합 방지 ---
test('gh pr ready 는 tp-merge 에만 있다', () => {
  const offenders = STEP_SKILLS
    .filter((s) => s !== 'tp-merge')
    .filter((s) => codeOf(s).includes('gh pr ready'));
  assert.deepEqual(offenders, [], `tp-merge 밖에서 초안 잠금을 푼다: ${offenders}`);
  assert.ok(codeOf('tp-merge').includes('gh pr ready'), 'tp-merge 에 잠금 해제 명령이 없다');
  // 비-공허 대조군 — 울타리 추출이 실제로 뭔가 뽑는지
  assert.ok(codeOf('tp-merge').length > 100, '코드 울타리 추출이 비었다');
});

// --- plan-review-loop-guard. 계획 루프 방지 ---
test('계획 검토가 tp-plan 을 다시 부르지 않는다', () => {
  const pr = read('tp-plan-review');
  assert.match(pr, /한 번만 돈다|두 번 돌지 않는다/, '루프 금지 문장이 없다');
  assert.doesNotMatch(pr, /Skill\(\{\s*skill:\s*["']tp-plan["']/, '계획 검토가 tp-plan 을 재호출한다');
});

// --- 지적 2. gstack 렌즈 세 마디 ---
test('gstack 렌즈 호출에 비대화형 세 마디가 박혀 있다', () => {
  const pr = read('tp-plan-review');
  for (const 마디 of ['비대화형으로 한 번만', '계획을 고치지 말고', '재검토 루프를 돌리지 마라']) {
    assert.ok(pr.includes(마디), `"${마디}" 가 없다`);
  }
});

// --- 지적 3. 선언·실측 등급 이중 측정 ---
test('선언 등급과 실측 등급을 서로 다른 단계에서 잰다', () => {
  assert.match(read('tp-start'), /선언 등급/, 'tp-start 가 선언 등급을 안 잰다');
  assert.match(read('tp-review'), /실측 등급을 다시 잰다/, 'tp-review 가 실측을 안 잰다');
  assert.match(read('tp-review'), /자동 승격하지 않는다/, '자동 승격 금지가 없다');
});

// --- CLAUDE.md §2.7 동반 수정 (SPEC 의 절이 아니다 — check:spec 이 구분한다) ---
test('SPEC 을 고칠 때 CLAUDE.md §2.7 여섯 곳이 체인에 배선돼 있다', () => {
  const spec = read('tp-spec');
  assert.match(spec, /§2\.7/, 'tp-spec 이 §2.7 을 안 가리킨다');
  // ④ SPEC 밖 일곱 곳이 이름으로 들어 있어야 한다
  for (const 곳 of ['WORKSTREAMS', 'orchestration.yaml', 'spec-review', 'SETUP', 'WORKFLOW', 'design-mockup', '코드에 박힌 상수']) {
    assert.ok(spec.includes(곳), `§2.7 ④ 에 "${곳}" 이 빠졌다`);
  }
  // ③ 가장 잘 빠뜨리는 라우터 표
  assert.match(spec, /라우터 표/, '§2.7 ③ 라우터 표가 빠졌다');
  // 실행은 tp-plan 이 할 일로 만든다
  assert.match(read('tp-plan'), /§2\.7 을 할 일로 만든다/, 'tp-plan 이 §2.7 을 할 일로 안 만든다');
});

// --- 게이트는 도구로 낸다 ---
test('세 게이트 전부 AskUserQuestion 을 요구한다', () => {
  const tp = read('tp');
  assert.match(tp, /AskUserQuestion`? 으로 낸다/, '게이트 도구 지시가 없다');
  assert.match(tp, /산문 3지선다 금지/, '산문 3지선다 금지가 없다');
  for (const g of ['게이트 0', '게이트 1', '게이트 2']) {
    assert.ok(tp.includes(g), `${g} 가 컨트롤러에 없다`);
  }
});

// --- 재로드 금지 (이번 설계의 핵심 절약) ---
test('선행 읽기 절을 둔 스킬은 재로드 금지를 함께 선언한다', () => {
  const 대상 = STEP_SKILLS.filter((s) => /## 선행 읽기/.test(read(s)));
  // 비-공허 대조군 — 아무도 선행 읽기 절이 없으면 이 검사는 공허하다
  assert.ok(대상.length >= 5, `선행 읽기 절을 둔 스킬이 ${대상.length}개뿐이다`);
  for (const s of 대상) {
    assert.match(read(s), /재로드 금지|직접 읽지 않는다|\*\*없음\.\*\*/, `${s} 에 재로드 금지가 없다`);
  }
});

// --- PR 상황판 배선 ---
test('일곱 단계 전부 pr-update.mjs 를 부른다', () => {
  const 면제 = new Set(['tp-spec']); // 컨트롤러가 대신 갱신한다
  const missing = STEP_SKILLS.filter((s) => !면제.has(s) && !read(s).includes('pr-update.mjs'));
  assert.deepEqual(missing, [], `PR 갱신을 빼먹은 단계: ${missing}`);
});

// --- 스킬이 안내하는 명령이 실재한다 ---
test('스킬이 부르는 npm 스크립트가 package.json 에 있다', () => {
  const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
  const 있는것 = new Set(Object.keys(pkg.scripts ?? {}));
  const 없는것 = new Set();
  for (const s of ['tp', ...STEP_SKILLS]) {
    // `npm run check:*` 처럼 와일드카드로 묶어 쓴 산문은 명령이 아니다
    for (const m of read(s).matchAll(/npm run ([a-z]+(?::[a-z]+)?)(?![a-z:*])/g)) {
      if (!있는것.has(m[1])) 없는것.add(`${s} → npm run ${m[1]}`);
    }
  }
  assert.deepEqual([...없는것], [], `실재하지 않는 명령을 안내한다`);
});
