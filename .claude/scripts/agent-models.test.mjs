// /tpx 체인 서브 에이전트의 모델 배분이 정의 파일과 스킬에 박혀 있는지 본다 (2026-10-06 사용자 — 토큰이 빨리 닳는다)
// effort 는 정의 머리(.claude/agents)에 박고, 정의 없이 내는 호출은 호출 블록에 적는다. 산문 「Sonnet 으로」만 두면 다음 세션이 잊는다
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { 절, 펜스블록 } from './md-sections.mjs';

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

// 같은 작업방의 병렬 구현자가 서로의 미커밋 파일을 쓸어 담았다 (PR #181 묶음 ① · LEARNINGS 2026-10-07 재발)
test('tpx-impl 구현자 프롬프트 필수 목록이 자기 files 만 이름으로 커밋하고 push 하지 않게 한다', () => {
  const 글 = readFileSync(new URL('tpx-impl/SKILL.md', SKILLS), 'utf8');
  const 시작 = 글.indexOf('프롬프트에 반드시 넣을 것');
  assert.ok(시작 >= 0, '대조군 — 「프롬프트에 반드시 넣을 것」 줄이 있어야 한다');
  const 목록 = 글.slice(시작, 글.indexOf('\n\n', 시작));
  assert.match(목록, /git commit[^\n]*-- <[^>]*경로>/, '커밋에 `-- <files 경로>` 를 붙이라는 말이 없다');
  assert.match(목록, /-A[^\n]*\.[^\n]*commit -a[^\n]*금지/, '`-A` · `.` · `commit -a` 금지가 없다');
  assert.match(목록, /push 하지 않는다/, '구현자는 push 하지 않는다는 말이 없다');
  assert.match(글, /묶음의 모든 할 일이 PASS 면[^\n]*\n[^\n]*컨트롤러[^\n]*commit[^\n]*-- <[^>]*경로>[^\n]*push/, '2-C 끝에 컨트롤러 커밋도 `commit -- <경로>` · push 는 묶음 사이라는 줄이 없다');
});

test('계획 검토 · 독립 검사 렌즈는 Opus 를 쓴다고 적혀 있다', () => {
  const 호출 = 펜스블록(스킬('tpx-plan-review'), 'Agent({');
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

test('검증자 정의가 GREEN 이 고친 검사 파일 기준을 늘 보는 기준으로 담고, 첫 줄이 그 기준을 가리키며, 2-C 가 정의를 가리킨다', () => {
  const 본문 = readFileSync(new URL('tpx-verifier.md', AGENTS), 'utf8').replace(/^---\n[\s\S]*?\n---\n/, '');
  assert.match(본문, /GREEN 커밋이 검사 파일을 고쳤으면[^\n]*「구현 중 바뀐 것」[^\n]*DRIFT/, '정의에 GREEN 이 고친 검사 파일 기준이 없다');
  assert.match(본문.split('\n').find((줄) => 줄.includes('거기 적힌 대로만')) ?? '', /늘 보는 기준/, '「거기 적힌 대로만 본다」 줄이 늘 보는 기준을 가리키지 않아 기준과 부딪힌다');
  assert.match(절2C(), /GREEN 커밋이 검사 파일을 고쳤으면[^\n]*tpx-verifier\.md/, '2-C 의 그 줄이 검증자 정의를 가리키지 않는다');
});

test('보조 실행자 정의는 Haiku · effort low 이고 도구가 Bash · Glob · Grep · Read 뿐이며 파일을 고치지 않는 것은 산문 규칙이고 로그 요약의 꼴을 정의 한 곳에 적는다', () => {
  const m = 머리('tpx-runner');
  assert.equal(m.name, 'tpx-runner');
  assert.equal(m.model, 'haiku');
  assert.equal(m.effort, 'low');
  assert.ok(m.tools, 'tools 를 적지 않으면 모든 도구를 받는다');
  assert.deepEqual(m.tools.split(/,\s*/).sort(), ['Bash', 'Glob', 'Grep', 'Read']);
  assert.doesNotMatch(m.description, /병합/, '병합은 메인이 한다 — 정의의 쓰임에 병합이 남았다');
  const 본문 = readFileSync(new URL('tpx-runner.md', AGENTS), 'utf8').replace(/^---\n[\s\S]*?\n---\n/, '');
  for (const 낱말 of ['실패한 명령', '검사 이름', '원문 그대로', '파일:줄', '줄 번호', '실행 번호']) {
    assert.ok(본문.includes(낱말), `로그 요약의 꼴에 「${낱말}」이 없다`);
  }
  assert.match(본문, /고칠 방법[^\n]*내지 않는다/, '요약이 고칠 방법을 내지 않는다는 줄이 없다');
  assert.match(본문, /파일을 고치지 않는다/, '파일을 고치지 않는다는 산문 규칙이 없다');
  assert.doesNotMatch(본문, /Opus 정의/, 'Opus 는 정의 파일이 없다 — 옛 문구가 남았다');
});

test('tpx-merge 는 Step 2 의 CI 기다리기만 tpx-runner 에 맡기고 병합은 메인이 새 실행 · success · 헤드를 확인한 뒤 직접 친다', () => {
  const 글 = 스킬('tpx-merge');
  const 호출 = 펜스블록(글, 'tpx-runner');
  assert.match(호출, /subagent_type: "tpx-runner"/, 'tpx-merge 에 tpx-runner 호출 블록이 없다');
  assert.match(호출, /1-record-ready-merge\.md/, '프롬프트가 명령 원문의 파일 경로를 가리키지 않는다');
  assert.match(호출, /## Step 2\./, '프롬프트가 Step 2 절 제목을 가리키지 않는다');
  assert.doesNotMatch(호출, /## Step 3\./, 'Step 3 병합까지 Haiku 에 넘긴다 — 병합은 메인이 확인 뒤 직접 친다');
  assert.match(호출, /BEFORE[\s\S]*NOW[\s\S]*CI EXIT/, '프롬프트가 BEFORE · NOW · CI EXIT 를 보고하게 하지 않는다');
  assert.match(호출, /충돌[\s\S]*DIRTY[\s\S]*새 실행[\s\S]*시간 초과[\s\S]*빨강[\s\S]*보고만/, '멈출 때 명령 없이 보고만 하게 하지 않는다');
  assert.match(호출, /timeout: 600000/, 'Bash 한 번 상한(timeout: 600000)을 적지 않았다');
  assert.match(호출, /제목/, '제목(`[작업중]` 을 뗀 것)을 메인이 만들어 넘기지 않는다');
  assert.match(글, /정의를 못 찾으면[\s\S]{0,160}general-purpose[\s\S]{0,80}model: "haiku"[\s\S]{0,40}effort: "low"/, '정의를 못 찾을 때 대신 낼 방법이 없다');
  assert.match(글, /정의를 못 찾으면[\s\S]{0,400}tpx-runner\.md[^\n]*본문[^\n]*프롬프트/, '대체 호출이 정의 본문을 프롬프트에 싣게 하지 않는다');
  assert.match(글, /Step 1[^\n]*메인/, 'Step 1 이 메인에 남는다는 줄이 없다');
  assert.match(글, /Step 4[^\n]*메인/, 'Step 4 이후가 메인에 남는다는 줄이 없다');
  assert.match(글, /메인이[^\n]*gh run view <실행 번호> --json conclusion,headSha/, '메인이 실행을 직접 확인하는 명령이 없다');
  assert.match(글, /NOW[^\n]*BEFORE[^\n]*success[^\n]*PR 헤드|BEFORE[^\n]*NOW[^\n]*success[^\n]*PR 헤드/, '새 실행 · success · PR 헤드 일치를 확인한다는 줄이 없다');
  assert.match(글, /메인이[^\n]*Step 3[^\n]*직접/, 'Step 3 병합을 메인이 직접 친다는 줄이 없다');
  assert.match(글, /gh pr view <번호> --json state[^\n]*메인|메인[^\n]*gh pr view <번호> --json state/, '병합 뒤 메인이 MERGED 를 직접 확인한다는 줄이 없다');
  assert.doesNotMatch(글, /gh run view <번호>/, '실행 번호 자리표시가 PR 번호(<번호>)와 같은 이름이다');
});

test('Step 2 명령 블록은 Bash 한 번 상한 안이고 tpx-runner 로 돌 때는 엣지 표의 행동 없이 멈춰 보고한다', () => {
  const 글 = 스킬('tpx-merge');
  assert.match(글, /timeout 540 gh run watch "\$NOW" --exit-status/, 'gh run watch 가 Bash 한 번 상한(10분) 안(timeout 540)이 아니다');
  assert.doesNotMatch(글, /timeout 900/, '옛 timeout 900 이 남았다');
  const 표 = 글.indexOf('### 실패 / 엣지');
  const 머리줄 = 글.indexOf('`tpx-runner` 로 돌 때는 이 표의 행동을 하지 않고 멈춰 보고한다');
  assert.ok(표 >= 0 && 머리줄 > 표 && 머리줄 < 글.indexOf('| 증상', 표), '엣지 표 앞에 「tpx-runner 로 돌 때는 이 표의 행동을 하지 않고 멈춰 보고한다」가 없다');
  assert.match(글, /\|[^\n]*124[^\n]*실행 번호[^\n]*다시 지켜[^\n]*통과로 읽지 않는다/, '시간 초과(124)면 실행 번호로 다시 지켜보고 통과로 읽지 않는다는 행이 없다');
  assert.doesNotMatch(글, /gh run view <번호>/, '실행 번호 자리표시가 PR 번호(<번호>)와 같은 이름이다');
});

test('tpx-review Step 4 는 EXIT 가 0 이 아닌 명령의 로그 요약을 tpx-runner 에 맡기고 로그 폴더를 넘긴다', () => {
  const 절4 = 절(스킬('tpx-review'), '## Step 4.');
  assert.match(절4, /EXIT[^\n]*0 이 아닌[^\n]*tpx-runner|tpx-runner[^\n]*EXIT[^\n]*0 이 아닌/, 'Step 4 에 실패 로그 요약을 tpx-runner 에 맡기는 줄이 없다');
  assert.match(절4, /tpx-runner[^\n]*로그 폴더|로그 폴더[^\n]*tpx-runner/, '요약을 맡길 때 로그 폴더 경로를 넘긴다는 줄이 없다');
  assert.match(절4, /tpx-runner\.md/, 'Step 4 가 요약의 꼴을 정의 파일에 맡기지 않는다');
  assert.match(절4, /정의를 못 찾으면[^\n]*general-purpose[^\n]*tpx-runner\.md[^\n]*본문[^\n]*프롬프트/, 'Step 4 에 정의를 못 찾을 때 정의 본문을 프롬프트에 싣는 대체 호출이 없다');
});

test('tpx-plan 은 찾기를 Explore · Sonnet · medium 으로 내고 받은 파일:줄은 컨트롤러가 열어 확인한다', () => {
  const 글 = 스킬('tpx-plan');
  assert.match(글, /subagent_type: "Explore"[\s\S]{0,80}model: "sonnet"[\s\S]{0,40}effort: "medium"/, 'tpx-plan 에 Explore 호출 줄이 없다');
  assert.match(글, /파일:줄[^\n]*컨트롤러[^\n]*열어/, '받은 파일:줄을 컨트롤러가 열어 확인한다는 줄이 없다');
  assert.match(글, /같은 규칙인가[^\n]*컨트롤러|컨트롤러[^\n]*같은 규칙인가/, '「같은 규칙인가」 판단을 컨트롤러가 한다는 줄이 없다');
});

test('tpx-impl 의 정의를 못 찾을 때 대체 호출은 effort 를 적고 「effort 는 정하지 못한다」가 없다', () => {
  const 글 = 스킬('tpx-impl');
  assert.doesNotMatch(글, /effort 는 정하지 못한다/, '에이전트 도구가 effort 를 받는데 못 정한다는 옛 줄이 남았다');
  assert.match(글, /정의를 못 찾으면[\s\S]{0,200}model: "sonnet"[\s\S]{0,40}effort: "high"/, '구현자 대체 호출에 effort 가 없다');
});
