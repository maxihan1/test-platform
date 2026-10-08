#!/usr/bin/env node
// Claude Code 훅 가드. CLAUDE.md 규칙 중 기계적으로 판정되는 것만 강제한다. 모드는 argv[2]
import { readFileSync, existsSync, readdirSync, appendFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { 기록요구 } from './lane.mjs';

const mode = process.argv[2];

// **mode 가 있을 때만 stdin 을 읽는다.** 판별식이 이 파일을 import 하면 mode 가 없는데,
// 맨 위에서 readFileSync(0) 을 하면 거기서 영영 막힌다 (2026-09-18 실측 — 테스트가 멈췄다)
let ev = {};
if (mode) {
  try { ev = JSON.parse(readFileSync(0, 'utf8')); } catch { process.exit(0); }
}

const input = ev.tool_input ?? {};
// 훅은 프로젝트 루트에서 돌지만, 워크트리 세션은 cwd가 다르므로 이벤트의 cwd를 우선한다
const cwd = ev.cwd ?? process.cwd();
const filePath = input.file_path ?? input.path ?? '';
const rel = filePath.replace(cwd + '/', '');

const block = (msg) => { console.error(msg); process.exit(2); };
const ok = () => process.exit(0);

// CLAUDE.md §5 의 금지 명령. **실행되는 자리에만 건다.**
// 2026-09-18 — `grep -n "branch -D" file` 같은 조회가 막혔다. 명령 문자열 어디에 있든
// 걸렸기 때문이다. 따옴표 안을 먼저 걷어내고, 이어 붙인 구간마다 따로 본다.
const BANNED = [
  [/\bpush\s+(?:[^;&|]*\s)?(?:--force|-f)(?:\s|$)/, '강제 push'],
  [/\bbranch\s+-D(?:\s|$)/, '브랜치 강제 삭제'],
  [/migrate[:\s-]*(?:down|rollback|undo)/i, '마이그레이션 되돌리기'],
  [/\brm\s+-rf\s+\/(?!home|tmp)/, '루트 경로 삭제'],
  // 명령 줄 무늬로 찾으면 그 무늬를 품은 도구 셸 자신도 걸려 같이 꺼진다 — 결과도 정리도 없이 셸이 죽는다.
  // SETUP §11 에 적었는데 2026-10-01 에 `$(pgrep -f …)` 로 또 겪었다. `pgrep -af` 로 번호를 보고 `kill <번호>`
  // 무늬 고르개는 `-f` 를 품은 묶음(`-af` · `-fx`)과 `--full` 둘 다다. 치환은 `$(…)` 와 백틱 둘 다
  [/\bpkill\s+(?:[^;&|]*\s)?(?:-\w*f\w*|--full)\b/, '무늬로 프로세스 끄기'],
  [/(?:\$\(|`)\s*pgrep\s+(?:[^)`]*\s)?(?:-\w*f\w*|--full)\b/, '무늬로 프로세스 끄기'],
  // 세션이 Bash 로 표지를 만들면 검사를 돌리지 않고도 push 가 통과한다. `node` 로 부르는 꼴만 — `grep` 처럼 글자만 든 명령은 통과
  [/\bnode\s+(?:[^;&|]*\s)?\S*check-stamp\.mjs\s+put(?:\s|$)/, '통과 표지 직접 찍기 — 표지는 run local 과 pre-push 훅만 찍는다'],
];

// 파이프로 이어지는 꼴은 구간을 나누면 둘로 갈라져 못 본다 — 나누기 전 명령 전체에 건다
const BANNED_WHOLE = [
  [/\bpgrep\s+(?:[^;&|]*\s)?(?:-\w*f\w*|--full)\b[^;&|]*\|\s*xargs\s+(?:-\S+\s+)*kill\b/, '무늬로 프로세스 끄기'],
];

/** 금지 명령이면 그 이름을, 아니면 null. 판별식이 이 함수만 부른다 */
export function isBanned(command) {
  // 따옴표 **안쪽만** 지운다. 바깥의 진짜 명령은 그대로 남는다 —
  // `git branch -D "my branch"` 는 여전히 잡히고 `grep "branch -D" f` 는 빠진다
  const 껍데기 = String(command ?? '')
    .replace(/'[^']*'/g, "''")
    .replace(/"[^"]*"/g, '""');

  for (const [re, label] of BANNED_WHOLE) {
    if (re.test(껍데기)) return label;
  }
  for (const 구간 of 껍데기.split(/;|&&|\|\||\||\n/)) {
    const s = 구간.trim();
    if (!s) continue;
    for (const [re, label] of BANNED) {
      if (re.test(s)) return label;
    }
  }
  return null;
}

// 응답 끝 경고의 「오늘」 — pre-push 는 date +%F(현지)라 UTC toISOString 이면 한국 00~09시에 하루 어긋난다 (2026-10-08)
export const 현지날짜 = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// 케이스 작성 보조는 묶음 넷까지 · 같은 묶음 다시 띄우기는 한 번까지 (도메인/작성 §3.6 「서브에이전트 팬아웃」, 2026-10-04).
// MKT 11211 은 「한 차례」 규칙을 두고도 세 차례를 돌아 2차만 98분을 썼다 — 산문으로는 안 지켜져 기계로 막는다.
// 묶음 이름은 tpx-author fanout.md §4 뼈대 첫 줄에서 뽑는다. 뼈대가 아닌 보조(화면 훑기)는 세지 않는다
const 묶음넷 = 4;
const 묶음줄 = /「([^」]+)」 묶음을 만든다/;
export function fanoutVerdict(기록, 프롬프트) {
  const 이름 = 묶음줄.exec(String(프롬프트 ?? ''))?.[1] ?? null;
  if (이름 === null) return { 셈: null };
  const 남은말 = ' 남은 묶음은 보조를 띄우지 말고 자식이 직접 쓴다 (tpx-author fanout.md §2 · §6).';
  const 띄운수 = 기록.filter((x) => x === 이름).length;
  if (띄운수 >= 2) return { 거절: `[차단] 「${이름}」 묶음은 이미 두 번 띄웠다 — 다시 띄우기는 한 번까지다(물러서기 포함).${남은말}` };
  if (띄운수 === 0 && new Set(기록).size >= 묶음넷) return { 거절: `[차단] 케이스 작성 보조는 묶음 ${묶음넷}개까지다. 「${이름}」은 ${묶음넷 + 1}번째 묶음이다.${남은말}` };
  return { 셈: 이름 };
}

const ESCAPE = process.env.ALLOW_PROTECTED === '1';

// 2026-09-17 비움 — 세 파일 변경이 전부 승인됐다. 검사는 spec-review A1~A3 이 한다
const LOCKED = [];
// 2026-09-18 소유 경로 판정을 걷어냈다 — OWNED 표 · SHARED · ownership 모드.
// 갈래를 알려 주는 WORKSTREAM 환경변수가 훅에 닿지 않아 한 번도 켜진 적이 없었고,
// 여러 세션이 동시에 도는 전제도 사라졌다 (/tpx 는 한 세션에서 순차로 돈다).
// 범위를 지키는 일은 이제 체인의 계획 단계와 사람이 본다 (CLAUDE.md §1.1).

const lockedMsg = (p, label) =>
`[차단] ${label}은 Phase 0에서 확정된 계약이다: ${p}

여기를 고치면 병렬 작업 중인 다른 갈래가 전부 어긋난다.
정말 변경이 필요하면 CLAUDE.md §1.2의 [계약 변경 필요] 형식으로
사용자에게 보고하고 승인을 받아라. 직접 고치지 마라.

병합 단계에서 정당하게 필요하면 ALLOW_PROTECTED=1 로 실행한다.`;


if (mode === 'protected') {
  if (ESCAPE) ok();
  for (const [p, label] of LOCKED) {
    if (rel.includes(p)) block(lockedMsg(rel, label));
  }
  ok();
}

if (mode === 'bash') {
  const cmd = input.command ?? '';
  const 이유 = isBanned(cmd);
  if (이유) {
    block(`[차단] ${이유}은 허용되지 않는다 (CLAUDE.md §5).\n명령: ${cmd}\n\n필요하다면 사용자에게 이유를 설명하고 직접 실행하게 해라.`);
  }

  // Bash 리다이렉트·sed -i·tee·mv·cp·rm은 Edit/Write 훅을 우회하는 통로다.
  // 경로 앞에 쓰기 연산자가 있으면 파일 수정으로 보고 같은 규칙을 건다 (휴리스틱)
  if (ESCAPE) ok();
  const WRITE_OP = /(^|[^\d&])>{1,2}|&>|\btee\b|\bsed\s+-[a-zA-Z]*i|\bperl\s+-[a-zA-Z]*i|\bmv\b|\bcp\b|\brm\b|\btruncate\b/;
  const PATH_TOKEN = /(?:^|[\s"'=])((?:apps|packages|infra|db|tests|docs)\/[\w.\/-]*|docker-compose\.yml)/g;
  const guide = '\n\n파일 수정은 Edit/Write 도구로만 한다. 그래야 훅이 규칙을 검사할 수 있다.';
  for (const m of cmd.matchAll(PATH_TOKEN)) {
    const p = m[1];
    // 같은 명령 구간(; && || | 줄바꿈으로 나뉜 조각) 안에 쓰기 연산자가 있을 때만 수정으로 본다.
    // 앞 구간의 tee나 리다이렉트 때문에 뒤의 읽기 명령까지 막히는 오탐을 줄인다
    const before = cmd.slice(0, m.index + m[0].length - p.length);
    const segment = before.split(/;|&&|\|\|?|\n/).pop();
    if (!WRITE_OP.test(segment)) continue;
    for (const [lp, label] of LOCKED) {
      if (p.includes(lp)) block(`[차단] Bash로 보호 경로를 고치려 한다: ${p}\n명령: ${cmd}\n\n` + lockedMsg(p, label) + guide);
    }
  }
  ok();
}

if (mode === 'tests') {
  // Phase 0의 데모 테스트는 defineCase/verify가 아직 없어 순수 Playwright(expect)로 쓴다.
  // 그래서 Phase 0(ALLOW_PROTECTED=1)에서는 이 검사를 건너뛴다. WS-C가 전환한 뒤부터 걸린다
  if (ESCAPE) ok();
  if (!/(^|\/)tests\//.test(rel) || !/\.(ts|js)$/.test(rel)) ok();
  if (!existsSync(filePath)) ok();
  const src = readFileSync(filePath, 'utf8');
  const lines = src.split('\n');
  const bad = [];

  lines.forEach((l, i) => {
    const t = l.trim();
    if (t.startsWith('//') || t.startsWith('/*') || t.startsWith('*')) {
      if (!t.startsWith('*/')) bad.push([i + 1, '주석', t.slice(0, 60)]);
    }
    if (/(^|[^.\w])expect\s*\(/.test(l)) {
      bad.push([i + 1, 'expect 직접 호출', t.slice(0, 60)]);
    }
  });

  if (bad.length) {
    const list = bad.map(([n, kind, text]) => `  ${n}행  ${kind}: ${text}`).join('\n');
    block(
`[차단] 테스트 코드 규칙 위반: ${rel}

${list}

SPEC §4 — tests/** 에는 주석을 쓰지 않는다.
설명은 아래 자리에 넣어라.
  이 테스트가 무엇을 검증하는가 → name
  어떤 상태를 전제하는가       → precondition
  이 단계에서 무엇을 하는가     → test.step 제목
  여기서 무엇을 확인하는가      → verify 문장

검증은 verify(문장, 실제값, 기대값)만 쓴다. expect는 결과에 문장을 남기지 않아
증적 문서에 아무것도 나오지 않는다.`);
  }
  ok();
}

if (mode === 'fanout') {
  // 작성 자식에서만 켠다 — 에이전트가 자식에게만 이 변수를 준다(authoring-run). 사람 세션은 그냥 지나간다
  const 자리 = process.env.AUTHORING_GATE3_DIR;
  if (!자리) ok();
  const 파일 = `${자리}/fanout.log`;
  let 기록 = [];
  try { 기록 = readFileSync(파일, 'utf8').split('\n').filter(Boolean); } catch { /* 처음이면 없다 */ }
  const 판정 = fanoutVerdict(기록, input.prompt);
  if (판정.거절) block(판정.거절);
  // 한 응답의 호출 넷이 동시에 돌아 읽고 고쳐 쓰면 서로 덮는다 — 한 줄씩 덧붙이고 줄 수로 센다.
  // ponytail: 다섯 이상을 한 응답에 나란히 띄우면 모두 빈 기록을 읽어 통과한다. 뼈대가 한 응답에 넷까지라 그대로 둔다
  if (판정.셈) {
    try { appendFileSync(파일, 판정.셈 + '\n'); } catch (e) { console.error(`[guard] 팬아웃 기록을 못 썼다 — 막지 않고 지나간다: ${e.message}`); }
  }
  ok();
}

if (mode === 'review') {
  // Stop 훅은 매 응답 끝마다 돈다. exit 2로 막으면 첫 편집 직후 의미 없는 자기검사를
  // 강제하게 되므로 여기서는 경고(exit 1)만 하고, 실제 차단은 pre-push 훅이 맡는다
  if (ESCAPE || ev.stop_hook_active) ok();
  let changed = '';
  try {
    // 이름 바꾸기가 새 경로 하나로 숨지 않게 --no-renames, 새 폴더가 한 줄로 접히지 않게 all
    changed = execFileSync('git', ['-c', 'core.quotePath=false', 'status', '--porcelain', '--no-renames', '--untracked-files=all', '--', 'apps', 'packages', 'tests'],
      { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch { ok(); }
  // 커밋을 마친 2등급 작업은 작업 폴더가 깨끗해 status 에 안 잡힌다 — 커밋분은 origin/main 과의 차이로 본다.
  // 응답마다 도는 경고라 diff 가 실패하면(origin/main 없음) 모를 때 떠들지 않고 커밋분은 빈 것으로 친다
  let committed = '';
  try {
    committed = execFileSync('git', ['-c', 'core.quotePath=false', 'diff', '--no-renames', '--name-only', 'origin/main...HEAD', '--', 'apps', 'packages', 'tests'],
      { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch { /* origin/main 없음 */ }
  if (!changed.trim() && !committed.trim()) ok();
  // 따옴표 친 경로는 못 읽은 것이다 — 모르면 경고 쪽
  const 줄들 = changed.split('\n').filter(Boolean);
  const 커밋줄 = committed.split('\n').filter(Boolean);
  const 경로들 = [...줄들.map((l) => l.slice(3)), ...커밋줄];
  if (!경로들.some((p) => p.startsWith('"')) && !기록요구(경로들)) ok();

  let latest = 0;
  try {
    for (const f of readdirSync(`${cwd}/docs/reviews`)) {
      const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(f);
      if (m) latest = Math.max(latest, Date.parse(`${m[1]}-${m[2]}-${m[3]}`));
    }
  } catch { /* 폴더 없음 */ }

  const today = Date.parse(현지날짜());
  if (latest < today) {
    console.error(
`[경고] 소스를 고쳤는데 오늘 SPEC 검사 기록이 없다.

변경된 파일:
${[...줄들, ...커밋줄].slice(0, 8).map((l) => '  ' + l).join('\n')}

작업을 끝내기 전에 spec-review 스킬을 돌려라.
치명 항목이 0건이면 docs/reviews/<날짜>-<WS>.md 에 결과를 남긴다.
치명이 남아 있으면 고치고 다시 돌린다.

푸시하려면 반드시 필요하다. pre-push 훅이 막는다.`);
    process.exit(1);
  }
  ok();
}

// **mode 가 있을 때만 끝낸다.** 판별식이 import 하면 mode 가 없는데, 맨 끝에서 무조건
// ok()(= process.exit(0))를 부르면 테스트가 첫 건만 돌고 프로세스가 죽는다 (2026-09-18 실측)
//
// 여기까지 왔다는 건 위 어느 모드에도 안 걸렸다는 뜻이다. 조용히 0 으로 끝내면
// 「배선은 됐는데 구현이 없는 훅」이 매번 돌면서 아무 일도 안 하고 아무 말도 안 한다.
// ownership 이 한 번도 안 켜진 채 살아남은 것이 이 침묵 때문이다 (2026-09-18).
if (mode) {
  console.error(`[guard] 모르는 모드다: ${mode}\n` +
    `settings.json 의 배선과 guard.mjs 의 구현이 어긋났다. guard-wiring.test.mjs 를 돌려 본다.`);
  process.exit(1);   // 2 는 「막는다」라 도구 호출이 차단된다. 배선 사고는 알리기만 한다
}
