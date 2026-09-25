// 체인 스킬 문서 자체를 검사한다. 산문으로만 적힌 규칙은 조용히 썩는다.
// 여기서 막는 넷은 전부 2026-09-18 실측에서 나온 것이다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';

const DIR = new URL('../skills/', import.meta.url);
const STEP_SKILLS = ['tpx-start', 'tpx-spec', 'tpx-plan', 'tpx-plan-review', 'tpx-impl', 'tpx-review', 'tpx-merge'];
// 큰 스킬은 SKILL.md + references/*.md 로 나뉜다. 단언이 절을 옮긴 뒤에도 물도록 둘을 이어 읽는다
const refsOf = (name) => {
  const 폴더 = new URL(`${name}/references/`, DIR);
  return existsSync(폴더) ? readdirSync(폴더).filter((f) => f.endsWith('.md')).sort() : [];
};
const read = (name) =>
  [
    readFileSync(new URL(`${name}/SKILL.md`, DIR), 'utf8'),
    ...refsOf(name).map((f) => readFileSync(new URL(`${name}/references/${f}`, DIR), 'utf8')),
  ].join('\n');

// 산문 속 언급과 실제로 돌릴 명령을 가른다. ``` 울타리 안만 실행문으로 본다 —
// 「이 스킬에서 절대 부르지 않는다」 같은 금지 문장이 위반으로 잡히던 것을 막는다
const codeOf = (name) =>
  [...read(name).matchAll(/```[a-z]*\n([\s\S]*?)```/g)].map((m) => m[1]).join('\n');

test('일곱 단계 스킬과 컨트롤러가 전부 실재한다 (공허한 통과 방지)', () => {
  const have = readdirSync(new URL('.', DIR));
  for (const s of ['tpx', ...STEP_SKILLS]) {
    assert.ok(have.includes(s), `${s} 스킬 폴더가 없다`);
    assert.ok(existsSync(new URL(`${s}/SKILL.md`, DIR)), `${s}/SKILL.md 가 없다`);
  }
});

// 2026-09-18 개명이 드러낸 구멍 둘. 폴더만 옮기고 frontmatter 를 안 고치면
// 이름은 옛것 그대로인데 위 단언은 초록이다 — 반쪽 개명이 통과한다
test('스킬의 frontmatter name 이 폴더 이름과 같다', () => {
  for (const s of ['tpx', ...STEP_SKILLS]) {
    assert.match(read(s), new RegExp(`^name: ${s}$`, 'm'), `${s}/SKILL.md 의 name: 이 폴더와 다르다`);
  }
});

test('옛 이름 폴더가 남아 있지 않다', () => {
  const 남은 = readdirSync(new URL('.', DIR)).filter((s) => /^tp(-|$)/.test(s));
  assert.deepEqual(남은, [], `개명이 반쯤 끝났다: ${남은}`);
});

test('컨트롤러가 가리키는 하위 스킬이 전부 실재한다', () => {
  const tpx = read('tpx');
  for (const s of STEP_SKILLS) {
    assert.ok(tpx.includes(`../${s}/SKILL.md`), `컨트롤러가 ${s} 를 안 가리킨다`);
  }
});

// --- 지적 1. 순서 드리프트 ---
test('초안 PR 을 파일 수정보다 먼저 연다고 적혀 있다', () => {
  const start = read('tpx-start');
  assert.match(start, /파일을 하나라도 고치기 전에/, 'tpx-start 에 순서 못박기가 없다');
  assert.match(read('tpx'), /A-1\. 순서 강제/, '컨트롤러에 순서 강제 절이 없다');
});

// --- pr-draft-guard. 작업 중 병합 방지 ---
test('gh pr ready 는 tpx-merge 에만 있다', () => {
  const offenders = STEP_SKILLS
    .filter((s) => s !== 'tpx-merge')
    .filter((s) => codeOf(s).includes('gh pr ready'));
  assert.deepEqual(offenders, [], `tpx-merge 밖에서 초안 잠금을 푼다: ${offenders}`);
  assert.ok(codeOf('tpx-merge').includes('gh pr ready'), 'tpx-merge 에 잠금 해제 명령이 없다');
  // 비-공허 대조군 — 울타리 추출이 실제로 뭔가 뽑는지
  assert.ok(codeOf('tpx-merge').length > 100, '코드 울타리 추출이 비었다');
});

// 2026-09-18 CI 가 초안에서 안 돌게 바뀌었다. 잠금을 풀기 전에는 검사 결과가 없으므로
// ready 뒤에 기다리지 않으면 검사 없이 병합한다.
//
// **`gh pr checks --watch` 는 안 된다** — 초안이 남긴 `skipping` 딱지를 통과로 읽고
// 2초 만에 EXIT=0 으로 빠져나온다 (2026-09-18 실측). 실행 번호가 바뀌는 것을 봐야 한다.
test('tpx-merge 가 초안을 푼 뒤 새 CI 실행을 기다린다', () => {
  const 코드 = codeOf('tpx-merge');
  const ready = 코드.indexOf('gh pr ready');
  const watch = 코드.indexOf('gh run watch');
  const merge = 코드.indexOf('gh pr merge');
  assert.ok(watch > -1, 'tpx-merge 에 gh run watch 가 없다');
  assert.match(코드, /--exit-status/, 'gh run watch 가 빨강을 종료 코드로 안 읽는다');
  assert.match(코드, /BEFORE=|databaseId/, '옛 실행과 새 실행을 구분하는 장치가 없다');
  assert.ok(ready > -1 && ready < watch, '기다림이 gh pr ready 보다 앞에 있다 — 그 자리엔 새 실행이 없다');
  assert.ok(merge > -1 && watch < merge, '기다림이 gh pr merge 보다 뒤에 있다 — 검사 전에 병합한다');
});

// --- plan-review-loop-guard. 계획 루프 방지 ---
test('계획 검토가 tpx-plan 을 다시 부르지 않는다', () => {
  const pr = read('tpx-plan-review');
  assert.match(pr, /한 번만 돈다|두 번 돌지 않는다/, '루프 금지 문장이 없다');
  assert.doesNotMatch(pr, /Skill\(\{\s*skill:\s*["']tpx-plan["']/, '계획 검토가 tpx-plan 을 재호출한다');
});

// --- 지적 2. gstack 렌즈 세 마디 ---
test('gstack 렌즈 호출에 비대화형 세 마디가 박혀 있다', () => {
  const pr = read('tpx-plan-review');
  for (const 마디 of ['비대화형으로 한 번만', '계획을 고치지 말고', '재검토 루프를 돌리지 마라']) {
    assert.ok(pr.includes(마디), `"${마디}" 가 없다`);
  }
});

// --- 지적 3. 선언·실측 등급 이중 측정 ---
test('선언 등급과 실측 등급을 서로 다른 단계에서 잰다', () => {
  assert.match(read('tpx-start'), /선언 등급/, 'tpx-start 가 선언 등급을 안 잰다');
  assert.match(read('tpx-review'), /실측 등급을 다시 잰다/, 'tpx-review 가 실측을 안 잰다');
  assert.match(read('tpx-review'), /자동 승격하지 않는다/, '자동 승격 금지가 없다');
});

// --- CLAUDE.md §2.7 동반 수정 (SPEC 의 절이 아니다 — check:spec 이 구분한다) ---
test('SPEC 을 고칠 때 CLAUDE.md §2.7 여섯 곳이 체인에 배선돼 있다', () => {
  const spec = read('tpx-spec');
  assert.match(spec, /§2\.7/, 'tpx-spec 이 §2.7 을 안 가리킨다');
  // ④ SPEC 밖 여섯 곳이 이름으로 들어 있어야 한다
  for (const 곳 of ['WORKSTREAMS', 'spec-review', 'SETUP', 'WORKFLOW', 'design-mockup', '코드에 박힌 상수']) {
    assert.ok(spec.includes(곳), `§2.7 ④ 에 "${곳}" 이 빠졌다`);
  }
  // ③ 가장 잘 빠뜨리는 라우터 표
  assert.match(spec, /라우터 표/, '§2.7 ③ 라우터 표가 빠졌다');
  // 실행은 tpx-plan 이 할 일로 만든다
  assert.match(read('tpx-plan'), /§2\.7 을 할 일로 만든다/, 'tpx-plan 이 §2.7 을 할 일로 안 만든다');
});

// --- 병합 뒤 main 최신화 (2026-09-18 — 세 번 병합하고 안 해서 여덟 커밋이 밀렸다) ---
test('tpx-merge 가 작업방에서 나온 뒤 main 을 최신화한다', () => {
  const m = read('tpx-merge');
  assert.match(m, /ExitWorktree/, 'tpx-merge 에 작업방 탈출이 없다');
  assert.ok(codeOf('tpx-merge').includes('git pull --ff-only origin main'), 'main 최신화 명령이 없다');
  // 순서가 뒤집히면 안 된다 — 나오기 전에는 git 이 거부한다
  assert.ok(m.indexOf('ExitWorktree') < m.indexOf('git pull --ff-only'), '나오기 전에 pull 하려 한다');
  // 뒤처짐 0 확인까지 있어야 「했다고 치는」 것을 막는다
  assert.ok(codeOf('tpx-merge').includes('git rev-list --count main..origin/main'), '최신화 확인이 없다');
});

test('diff 기준이 origin/main 이다 — 로컬 main 은 낡을 수 있다', () => {
  // 2026-09-18 실측. 로컬 main 이 8커밋 뒤처졌을 때 `main...HEAD` 가 19파일을 냈다.
  // 실제로 바뀐 것은 3파일이었고, 실측 등급 판정이 통째로 틀렸다
  const 위반 = [];
  for (const s of ['tpx', ...STEP_SKILLS, 'spec-review']) {
    for (const [, line] of read(s).split('\n').entries()) {
      if (/(?<!origin\/)\bmain\.\.\.?HEAD/.test(line)) 위반.push(`${s}: ${line.trim().slice(0, 60)}`);
    }
  }
  assert.deepEqual(위반, [], '로컬 main 을 diff 기준으로 쓴다');
  // 비-공허 대조군 — 아무 스킬도 diff 를 안 쓰면 이 검사는 공허하다
  const 쓰는곳 = ['tpx', ...STEP_SKILLS].filter((s) => read(s).includes('origin/main...HEAD'));
  assert.ok(쓰는곳.length >= 3, `origin/main...HEAD 를 쓰는 스킬이 ${쓰는곳.length}개뿐이다`);
});

// --- 병합 뒤 브랜치 정리 (2026-09-18 — 없어서 12개를 손으로 지웠다) ---
test('tpx-merge 가 원격 브랜치를 병합과 함께 지운다', () => {
  assert.ok(codeOf('tpx-merge').includes('gh pr merge <번호> --merge --delete-branch'),
    '병합 명령에 --delete-branch 가 없다');
});

test('tpx-merge 가 로컬 브랜치를 -d 로만 치운다', () => {
  const m = read('tpx-merge');
  const code = codeOf('tpx-merge');
  assert.ok(code.includes('git branch -d'), '로컬 브랜치 정리 명령이 없다');
  // 강제 삭제는 실행문에 없어야 한다. 「사람이 직접」 안내문의 언급은 울타리 밖이라 걸리지 않는다
  assert.doesNotMatch(code, /git branch -D(?:\s|$)/m, 'tpx-merge 가 강제 삭제를 실행한다');
  // 순서 — 작업방 제거(Step 4)가 브랜치 삭제(Step 5)보다 먼저다. 뒤집으면 git 이 거부한다
  const step4 = m.indexOf('## Step 4');
  const step5 = m.indexOf('## Step 5');
  assert.ok(step4 >= 0 && step5 >= 0, 'tpx-merge 에 Step 4 또는 5 가 없다');
  assert.ok(step4 < step5, '브랜치 정리가 작업방 제거보다 앞에 있다');
  // 거부당한 브랜치를 보고하라는 지시
  assert.match(m, /정리 못 한 브랜치/, '지우지 못한 브랜치를 보고하는 자리가 없다');
});

test('tpx-merge 가 --done 으로 체크리스트를 닫는다', () => {
  // --step 7 은 7번을 「지금 여기」로만 그리고 끝내 체크하지 않는다 (2026-09-18 실측)
  const code = codeOf('tpx-merge');
  assert.ok(/pr-update\.mjs[^\n]*--done/.test(code), 'tpx-merge 가 --done 을 안 부른다');
  assert.doesNotMatch(code, /pr-update\.mjs[^\n]*--step 7/, 'tpx-merge 가 아직 --step 7 을 쓴다');
});

test('CLAUDE.md §5 가 가드와 같은 말을 한다', () => {
  const claude = readFileSync(new URL('../../CLAUDE.md', import.meta.url), 'utf8');
  // 산문이 「브랜치 삭제」를 통째로 금지하면 안전한 정리까지 못 하는 줄 안다 (2026-09-18)
  assert.match(claude, /브랜치 강제 삭제/, '§5 가 강제 삭제로 좁혀 적지 않았다');
  assert.match(claude, /git branch -d/, '§5 가 병합된 브랜치 정리를 허용한다고 안 적었다');
});

test('tpx-start 가 낡은 체크아웃을 먼저 잡는다', () => {
  const s = read('tpx-start');
  assert.ok(codeOf('tpx-start').includes('git rev-list --count main..origin/main'), 'tpx-start 에 뒤처짐 검사가 없다');
  // 등급 판정보다 먼저여야 한다. indexOf 가 -1 을 돌려 공허하게 통과하는 것을 막는다
  const step0 = s.indexOf('## Step 0');
  const step1 = s.indexOf('## Step 1');
  assert.ok(step0 >= 0, 'tpx-start 에 Step 0 이 없다');
  assert.ok(step1 >= 0, 'tpx-start 에 Step 1 이 없다');
  assert.ok(step0 < step1, '뒤처짐 검사가 Step 1 뒤에 있다');
});

// --- 게이트는 도구로 낸다 ---
test('세 게이트 전부 AskUserQuestion 을 요구한다', () => {
  const tpx = read('tpx');
  assert.match(tpx, /AskUserQuestion`? 으로 낸다/, '게이트 도구 지시가 없다');
  assert.match(tpx, /산문 3지선다 금지/, '산문 3지선다 금지가 없다');
  for (const g of ['게이트 0', '게이트 1', '게이트 2']) {
    assert.ok(tpx.includes(g), `${g} 가 컨트롤러에 없다`);
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
  const 면제 = new Set(['tpx-spec']); // 컨트롤러가 대신 갱신한다
  const missing = STEP_SKILLS.filter((s) => !면제.has(s) && !read(s).includes('pr-update.mjs'));
  assert.deepEqual(missing, [], `PR 갱신을 빼먹은 단계: ${missing}`);
});

// --- 맥 작성 경로의 자식 (2026-09-23) ---
// 자식이 git 을 치면 맥의 commit·push 와 부딪히고, background 를 남기면 턴이 먼저 끝나 멈춘다.
// 금지 문장은 산문에 있어도 되므로 울타리 안만 본다
test('tpx-author 는 git·gh·background 를 실행하지 않는다', () => {
  assert.match(read('tpx-author'), /^name: tpx-author$/m, 'tpx-author/SKILL.md 의 name: 이 폴더와 다르다');
  const 코드 = codeOf('tpx-author');
  for (const 금지 of ['git ', 'gh ', 'run_in_background']) {
    assert.ok(!코드.includes(금지), `tpx-author 의 코드 울타리에 "${금지}" 가 있다`);
  }
  // 비-공허 대조군 — 울타리가 비면 위 단언은 늘 통과한다
  assert.ok(코드.includes('npm run check:tests'), 'tpx-author 에 관문 명령 울타리가 없다');
  assert.match(read('tpx-cases'), /tpx-author/, 'tpx-cases 가 tpx-author 에서도 불린다는 것을 안 적었다');
});

// --- 스킬이 안내하는 명령이 실재한다 ---
test('스킬이 부르는 npm 스크립트가 package.json 에 있다', () => {
  const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
  const 있는것 = new Set(Object.keys(pkg.scripts ?? {}));
  const 없는것 = new Set();
  for (const s of ['tpx', ...STEP_SKILLS]) {
    // `npm run check:*` 처럼 와일드카드로 묶어 쓴 산문은 명령이 아니다
    for (const m of read(s).matchAll(/npm run ([a-z]+(?::[a-z]+)?)(?![a-z:*])/g)) {
      if (!있는것.has(m[1])) 없는것.add(`${s} → npm run ${m[1]}`);
    }
  }
  assert.deepEqual([...없는것], [], `실재하지 않는 명령을 안내한다`);
});

// --- 차선 (2026-09-25) — 바뀐 만큼만 검사한다 ---
// 명세만 바뀐 일은 3등급이어도 계획·게이트 0/1 없이 spec-review · 게이트 2 만 돈다 (사용자 결정)
test('컨트롤러가 차선 규칙을 적었다 — 명세만 바뀌면 spec-review 와 게이트 2 만', () => {
  const 절 = /## 차선[\s\S]*?(?=\n## )/.exec(read('tpx'))?.[0] ?? '';
  assert.ok(절, 'tpx/SKILL.md 에 「## 차선」 절이 없다');
  assert.match(절, /detect-tier/, '차선을 어디서 읽는지(detect-tier)를 안 적었다');
  assert.match(절, /spec-review/);
  assert.match(절, /게이트 2/);
});

// 전체 npm test 를 3회 돌리던 자리. 이제 바뀐 것과 이어진 검사 + 늘 도는 목록이다
test('구현·검사 단계가 전체 npm test 대신 바뀐 것만 돈다', () => {
  for (const s of ['tpx-impl', 'tpx-review']) {
    const 코드 = codeOf(s);
    assert.match(코드, /npm run test:changed -- origin\/main/, `${s} 가 test:changed 를 안 부른다`);
    assert.match(코드, /npm run test:always/, `${s} 가 test:always 를 안 부른다 — 인증 route 검사가 빠진다`);
    assert.doesNotMatch(코드, /(^|\s)npm test\b/m, `${s} 가 아직 전체 npm test 를 부른다`);
    assert.doesNotMatch(read(s), /연속 3회/, `${s} 에 옛 「연속 3회」 규칙이 남았다`);
  }
});

// 분리 뒤 SKILL.md 가 안 가리키는 references 파일은 아무도 안 읽는다
test('references/*.md 는 전부 제 스킬의 SKILL.md 가 이름으로 가리킨다', () => {
  const 고아 = readdirSync(new URL('.', DIR))
    .filter((s) => existsSync(new URL(`${s}/SKILL.md`, DIR)))
    .flatMap((s) => {
      const 본 = readFileSync(new URL(`${s}/SKILL.md`, DIR), 'utf8');
      return refsOf(s).filter((f) => !본.includes(`references/${f}`)).map((f) => `${s}/references/${f}`);
    });
  assert.deepEqual(고아, [], `SKILL.md 가 안 가리키는 references 파일: ${고아}`);
});

// 2026-09-25 분리 직전의 머리글 목록. 분리가 절을 흘리면 여기서 잡힌다
const 절목록 = {
  tpx: [
    '## 체인 일곱 단계',
    '## A-0. 중단된 작업 감지 (모든 입력에 선행, 필수)',
    '## A-1. 순서 강제 — 이 표를 어기지 않는다',
    '## 등급 판정',
    '## 등급별 절차 (이 표가 정본)',
    '## 차선 — 바뀐 만큼만 검사한다 (2026-09-25)',
    '## 게이트',
    '## 선행 읽기 — 여기서 한 번만 읽는다',
    '## PR 이 진행 상황판이다',
    '## 진행 출력',
    '## 막혔을 때',
    '## 관련 스킬',
  ],
  'tpx-merge': [
    '## 선행 조건',
    '## 선행 읽기',
    '## Step 1. ★ 기록을 **먼저** 쓴다 — 그다음 전수 확인',
    '## Step 2. ★ 여기서 처음 초안 잠금을 푼다',
    '## Step 3. 병합',
    '## Step 4. ★ 작업방에서 나와 main 을 최신화한다',
    '## Step 5. 브랜치를 치운다 — `-d` 만 쓴다',
    '## Step 6. 기록 — 이게 다음 세션의 입력이다',
    '## <날짜>',
    '## Step 7. PR 을 닫는다 — 체크리스트를 전부 채운다',
    '## 출력',
    '## 실패 / 엣지',
  ],
  'spec-review': [
    '## 이 스킬이 존재하는 이유',
    '## 두 가지 철칙',
    '## 절차',
    '## 체크리스트',
    '## 보고 형식',
    '## 요약',
    '## 치명',
    '## 중대',
    '## 통과한 항목',
    '## 하지 말 것',
  ],
  'tpx-cases': [
    '## 선행 읽기',
    '## 척추 — 왜 이 순서인가',
    '## §1. 입력 확인',
    '## §2. 요구사항 표 — 분해 규칙',
    '## 🛑 §3. 내부 게이트 — 표를 승인받는다',
    '## §4. selector 확정 — 화면을 실제로 연다',
    '## 용어 사전',
    '## §5. 케이스 작성',
    '## §6. 검증 관문 넷',
    '## §7. 표 되채우기와 커밋',
    '## §8. 반환',
    '## 막혔을 때',
  ],
};

test('분리 뒤에도 절과 규칙이 남는다', () => {
  for (const [s, 머리들] of Object.entries(절목록)) {
    const 본문 = read(s);
    const 빠짐 = 머리들.filter((h) => !본문.includes(`\n${h}\n`));
    assert.deepEqual(빠짐, [], `${s} 에서 절이 사라졌다`);
  }
  const 케이스 = read('tpx-cases');
  const 규칙빠짐 = Array.from({ length: 16 }, (_, i) => `R${i + 1}`).filter(
    (r) => !new RegExp(`\\b${r}\\b`).test(케이스),
  );
  assert.deepEqual(규칙빠짐, [], `tpx-cases 에서 규칙이 사라졌다: ${규칙빠짐}`);
});

// 자식 세션과 각 단계가 매번 통째로 읽는 문서라 길면 읽는 값이 쌓인다 (2026-09-25 사용자 지시 — 200줄 이하, 모듈로 분리).
// playwright-cli 는 Microsoft 원본을 그대로 담아 둔 것이라 손대지 않는다 (CLAUDE.md 「저장소에 담아 둔 남의 스킬」)
test('스킬 문서는 파일마다 200줄 이하다 — playwright-cli 제외', () => {
  const 넘침 = [];
  for (const s of readdirSync(DIR).filter((n) => n !== 'playwright-cli' && existsSync(new URL(`${n}/SKILL.md`, DIR)))) {
    for (const 파일 of ['SKILL.md', ...refsOf(s).map((f) => `references/${f}`)]) {
      const 줄 = readFileSync(new URL(`${s}/${파일}`, DIR), 'utf8').split('\n').length - 1;
      if (줄 > 200) 넘침.push(`${s}/${파일} ${줄}줄`);
    }
  }
  assert.deepEqual(넘침, [], `200줄을 넘는 스킬 문서: ${넘침.join(', ')}. 절을 references/ 로 옮긴다`);
});
