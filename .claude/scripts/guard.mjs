#!/usr/bin/env node
// Claude Code 훅 가드. CLAUDE.md 규칙 중 기계적으로 판정되는 것만 강제한다. 모드는 argv[2]
import { readFileSync, existsSync, appendFileSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';

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
  // 맥의 임시 폴더(작업 tmp)는 /Users/<이름>/ 아래 깊은 곳이다 — 홈 폴더 자체만 막고 그 안쪽은 지운다 (2026-10-09 오탐 둘)
  [/\brm\s+-rf\s+\/(?!tmp|(?:home|Users)\/[^/\s]+\/[^\s])/, '루트 경로 삭제'],
  // 명령 줄 무늬로 찾으면 그 무늬를 품은 도구 셸 자신도 걸려 같이 꺼진다 — 결과도 정리도 없이 셸이 죽는다.
  // SETUP §11 에 적었는데 2026-10-01 에 `$(pgrep -f …)` 로 또 겪었다. `pgrep -af` 로 번호를 보고 `kill <번호>`
  // 무늬 고르개는 `-f` 를 품은 묶음(`-af` · `-fx`)과 `--full` 둘 다다. 치환은 `$(…)` 와 백틱 둘 다
  [/\bpkill\s+(?:[^;&|]*\s)?(?:-\w*f\w*|--full)\b/, '무늬로 프로세스 끄기'],
  [/(?:\$\(|`)\s*pgrep\s+(?:[^)`]*\s)?(?:-\w*f\w*|--full)\b/, '무늬로 프로세스 끄기'],
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

// 화면 훑기 보조(author-scan)의 브라우저는 서버로 저장 · 변경 요청을 못 보낸다 (PRD-F9-27).
// R6 MKS 보조가 「임시 저장」을 누르고 장바구니 수량을 10 으로 바꿨다 — 지침 문장만으로는 안 지켜졌다.
// 버튼 이름으로 고르면 「+」 같은 버튼을 놓치고 옵션 없이 「담기」를 눌러 보는 안내 문구까지 막는다 — 그래서 요청 방식으로 막는다.
// 로그아웃 · 탈퇴 · GET 으로 담기 · 삭제하는 링크는 방식으로 못 가른다 — 아래 막기코드가 주소 낱말로 끊는다. 하나가 로그아웃하면 같은 상태 파일을 쓴 다른 보조도 풀린다.
// ponytail: 조회를 POST 로 하는 사이트(GraphQL)는 보조가 그 데이터를 못 본다 — 그런 서버가 오면 읽기 POST 예외를 더한다
// ponytail: 서비스 워커가 직접 보내는 요청 · 웹소켓 메시지는 가로채기 밖이다 — 그런 사이트가 오면 서비스 워커 막기 · routeWebSocket 을 더한다
export const 훑기보조 = 'author-scan';
// 셸로 감싼 꼴(`bash -c "…"` · `$(…)` · 괄호)도 보게 따옴표를 걷지 않는다 — 못 알아보면 막기 없이 움직이므로 넓게 잡는다
const 플레이 = /(?:^|[\s"'`(])(?:npx\s+(?:\S+\s+)*?playwright(?:@\S+)?\s+cli|playwright-cli|\S*\/playwright\s+cli)(?=\s|$)(.*)$/;
// 값을 따로 받는 전역 옵션 — 그 값을 명령 이름으로 읽지 않게
const 값옵션 = /^(?:--config|--browser|--device|--profile)$/;
// 브라우저가 서버로 요청을 보내지 않는 명령 — 막기를 걸지 않고 지나간다. 여기 없는 명령은 건다
const 보기만 = new Set([
  'close', 'list', 'close-all', 'kill-all', 'delete-data', 'install', 'install-browser', 'snapshot', 'find', 'screenshot', 'pdf',
  'state-load', 'state-save', 'requests', 'request', 'request-headers', 'request-body', 'response-headers', 'response-body',
  'console', 'tab-list', 'route-list', 'cookie-list', 'cookie-get', 'localstorage-list', 'localstorage-get',
  'sessionstorage-list', 'sessionstorage-get', 'generate-locator', 'highlight', 'resize',
]);
// 막기를 풀거나 비껴갈 수 있다
const 못씀 = new Set(['run-code', 'route', 'unroute', 'network-state-set']);

const 거절 = (말) => ({ 거절: `[차단] ${말} (PRD-F9-27)` });

/**
 * 훑기 보조의 명령 판정 — 거절 글, 아니면 막기를 걸 세션(기본 세션은 '')과 걸었다는 표시를 지울 세션(새로 열거나 닫는다 · '*' 는 전부).
 * 한 명령에 움직이는 세션은 하나다 — 세션마다 막기를 거는 시간이 쌓여 훅 한도를 넘으면 훅이 막지 못하고 지나간다
 */
export function scanVerdict(command) {
  const 세션들 = new Set();
  const 지울 = new Set();
  for (const 구간 of String(command ?? '').split(/;|&&|\|\||\||&|\n/)) {
    const m = 플레이.exec(구간);
    if (!m) continue;
    let 세션 = '';
    let 명령 = null;
    const 남은 = [];
    const 낱들 = m[1].trim().split(/\s+/).map((x) => x.replace(/^["'`(]+|["'`);]+$/g, ''));
    for (let i = 0; i < 낱들.length; i++) {
      const 낱 = 낱들[i];
      const s = /^(?:-s|--session)(?:=(.*))?$/.exec(낱);
      if (s) 세션 = (s[1] ?? 낱들[++i] ?? '').replace(/^["']|["']$/g, '');
      else if (값옵션.test(낱)) i++;
      else if (낱.startsWith('-') || 낱 === '') continue;
      else if (명령 === null) 명령 = 낱;
      else 남은.push(낱);
    }
    if (명령 === null) continue;
    if (못씀.has(명령)) return 거절(`화면 훑기 보조는 \`${명령}\` 을 못 쓴다 — 저장 · 변경 요청 막기를 풀 수 있다`);
    if (['close-all', 'kill-all'].includes(명령)) { 지울.add('*'); continue; }
    if (['open', 'close', 'delete-data'].includes(명령)) {
      if (명령 === 'open' && 남은.length > 0) return 거절('open 은 주소 없이 연다 — 열자마자 화면이 서버로 요청을 보내는데 막기는 열린 뒤에 건다. 주소는 다음 명령 goto 로 연다');
      지울.add(세션);
      continue;
    }
    if (보기만.has(명령)) continue;
    if (지울.has(세션)) return 거절(`같은 명령에서 연 세션 ${세션 || '기본'} 을 바로 움직이지 않는다 — 막기는 열린 뒤에 건다. open · state-load 까지 한 명령, 이동부터는 다음 명령으로 부른다`);
    세션들.add(세션);
  }
  if (세션들.size > 1) return 거절('한 명령에 세션 하나만 움직인다 — 세션마다 막기를 거는 시간이 쌓여 훅이 시간을 넘긴다');
  return { 세션들: [...세션들], 지울: [...지울] };
}

// 세션 브라우저 전체(새 탭 포함)에 건다. 브라우저 안 표시는 가로채기가 걸린 뒤에 단다 — 먼저 달면 한 번 실패한 세션이 다음부터 막기 없이 지나간다
// GET 으로 동작하는 주소는 크롤러(authoring-crawl-rules.ts 위험낱말 · 위험파일 · 동작인자)와 같은 낱말로 끊는다 — 내려받기만 뺐다(훑기에는 해가 없다)
export const 막기코드 = String.raw`async page => { const c = page.context(); if (c.__scanReadOnly) return; const cut = [/log-?out|log-?off|sign-?out|(?:^|[\/_.\-?&=])(?:out\.php|delete|del|remove|add|cancel|like|toggle|withdraw\w*|unsubscribe|leave|good|nogood|wish|scrap|vote|follow|unregister|secession|deactivate|resign)(?=$|[\/_.\-?&=])/i, /(?:update|delete|insert|good|wish|scrap|vote|proc)[^\/]*\.(?:php|do|jsp|aspx?)$/i, /[?&](?:(?:action|act|cmd|mode|op)=(?!disp|view|list|read|show)|w=d(?:&|$))/i]; await c.route('**/*', r => { const q = r.request(); const u = new URL(q.url()); return ['GET', 'HEAD', 'OPTIONS'].includes(q.method()) && !cut[0].test(u.pathname + u.search) && !cut[1].test(u.pathname) && !cut[2].test(u.search) ? r.fallback() : r.abort('blockedbyclient'); }); c.__scanReadOnly = true; }`;
// 걸었다는 표시 — 명령마다 브라우저에 다시 묻지 않게(한 번에 1~2초). 그 세션을 열거나 닫는 명령이 지운다
const 표시자리 = () => `${tmpdir()}/scan-guard`;
const 표시 = (세션) => `${표시자리()}/${createHash('sha1').update(`${cwd}\n${세션}`).digest('hex')}`;
function 저장막기(세션) {
  if (existsSync(표시(세션))) return null;
  const r = spawnSync('npx', ['playwright', 'cli', ...(세션 ? [`-s=${세션}`] : []), 'run-code', 막기코드], { cwd, encoding: 'utf8', timeout: 30_000 });
  if (r.error) return r.error.message;
  if (r.status !== 0) return `${r.stdout ?? ''}${r.stderr ?? ''}`.trim().slice(0, 300) || `종료 ${String(r.status)}`;
  try { mkdirSync(표시자리(), { recursive: true }); writeFileSync(표시(세션), ''); } catch { /* 표시를 못 남기면 다음 명령이 다시 묻는다 */ }
  return null;
}

if (mode === 'bash') {
  const cmd = input.command ?? '';
  const 이유 = isBanned(cmd);
  if (이유) {
    block(`[차단] ${이유}은 허용되지 않는다 (CLAUDE.md §5).\n명령: ${cmd}\n\n필요하다면 사용자에게 이유를 설명하고 직접 실행하게 해라.`);
  }
  if (ev.agent_type === 훑기보조) {
    const 판 = scanVerdict(cmd);
    if (판.거절) block(판.거절);
    for (const 세션 of 판.지울) rmSync(세션 === '*' ? 표시자리() : 표시(세션), { recursive: true, force: true });
    for (const 세션 of 판.세션들) {
      const 까닭 = 저장막기(세션);
      if (까닭) block(`[차단] 브라우저 세션 ${세션 || '기본'} 에 저장 · 변경 막기를 못 걸어 움직이지 않는다 — ${까닭} (PRD-F9-27)`);
    }
  }
  ok();
}

if (mode === 'tests') {
  // 작업 폴더 밖(절대 경로로 남는 것 — 임시 폴더의 tests/ 등)은 이 저장소 케이스가 아니다 (2026-10-09 오탐)
  if (rel.startsWith('/') || !/(^|\/)tests\//.test(rel) || !/\.(ts|js)$/.test(rel)) ok();
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
