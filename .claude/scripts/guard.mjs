#!/usr/bin/env node
// Claude Code 훅 가드. CLAUDE.md 규칙 중 기계적으로 판정되는 것만 강제한다. 모드는 argv[2]
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';

const mode = process.argv[2];
const raw = readFileSync(0, 'utf8');
let ev = {};
try { ev = JSON.parse(raw); } catch { process.exit(0); }

const input = ev.tool_input ?? {};
// 훅은 프로젝트 루트에서 돌지만, 워크트리 세션은 cwd가 다르므로 이벤트의 cwd를 우선한다
const cwd = ev.cwd ?? process.cwd();
const filePath = input.file_path ?? input.path ?? '';
const rel = filePath.replace(cwd + '/', '');

const block = (msg) => { console.error(msg); process.exit(2); };
const ok = () => process.exit(0);

const ESCAPE = process.env.ALLOW_PROTECTED === '1';

// 2026-09-17 비움 — 세 파일 변경이 전부 승인됐다. 검사는 spec-review A1~A3 이 한다
const LOCKED = [];
const OWNED = {
  A: ['apps/admin/src/catalog/'],
  B: ['apps/admin/src/execution/'],
  C: ['apps/runner/', 'packages/kit/src/runtime/', 'tests/'],
  D: ['apps/admin/src/reporting/', 'infra/grafana/'],
  E: ['apps/admin/src/web/'],
  F: ['apps/admin/src/auth/', 'scripts/'],
};
const SHARED = ['docs/', '.claude/'];

const lockedMsg = (p, label) =>
`[차단] ${label}은 Phase 0에서 확정된 계약이다: ${p}

여기를 고치면 병렬 작업 중인 다른 갈래가 전부 어긋난다.
정말 변경이 필요하면 CLAUDE.md §1.2의 [계약 변경 필요] 형식으로
사용자에게 보고하고 승인을 받아라. 직접 고치지 마라.

병합 단계에서 정당하게 필요하면 ALLOW_PROTECTED=1 로 실행한다.`;

const ownershipMsg = (ws, p, owned) =>
`[차단] WS-${ws} 소유 경로 밖이다: ${p}

담당 경로: ${owned.join(', ')}

다른 갈래의 파일이 잘못돼 보여도 고치지 마라. 사용자에게 보고만 해라.
필요한 것이 있으면 타입이나 API 계약을 통해서만 접근한다.`;

const ownedPaths = () => {
  const ws = process.env.WORKSTREAM;
  if (!ws) return null;
  return [ws.toUpperCase(), OWNED[ws.toUpperCase()] ?? null];
};

if (mode === 'protected') {
  if (ESCAPE) ok();
  for (const [p, label] of LOCKED) {
    if (rel.includes(p)) block(lockedMsg(rel, label));
  }
  ok();
}

if (mode === 'bash') {
  const cmd = input.command ?? '';
  const banned = [
    [/push\s+.*(--force|-f)\b/, '강제 push'],
    [/branch\s+-D\b/, '브랜치 강제 삭제'],
    [/migrate[:\s-]*(down|rollback|undo)/i, '마이그레이션 되돌리기'],
    [/rm\s+-rf\s+\/(?!home|tmp)/, '루트 경로 삭제'],
  ];
  for (const [re, label] of banned) {
    if (re.test(cmd)) {
      block(`[차단] ${label}은 허용되지 않는다 (CLAUDE.md §5).\n명령: ${cmd}\n\n필요하다면 사용자에게 이유를 설명하고 직접 실행하게 해라.`);
    }
  }

  // Bash 리다이렉트·sed -i·tee·mv·cp·rm은 Edit/Write 훅을 우회하는 통로다.
  // 경로 앞에 쓰기 연산자가 있으면 파일 수정으로 보고 같은 규칙을 건다 (휴리스틱)
  if (ESCAPE) ok();
  const WRITE_OP = /(^|[^\d&])>{1,2}|&>|\btee\b|\bsed\s+-[a-zA-Z]*i|\bperl\s+-[a-zA-Z]*i|\bmv\b|\bcp\b|\brm\b|\btruncate\b/;
  const PATH_TOKEN = /(?:^|[\s"'=])((?:apps|packages|infra|db|tests|docs)\/[\w.\/-]*|docker-compose\.yml)/g;
  const guide = '\n\n파일 수정은 Edit/Write 도구로만 한다. 그래야 훅이 규칙을 검사할 수 있다.';
  const wsInfo = ownedPaths();
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
    if (wsInfo && wsInfo[1]) {
      const [ws, owned] = wsInfo;
      if (SHARED.some((s) => p.startsWith(s))) continue;
      if (!owned.some((o) => p.startsWith(o))) {
        block(`[차단] Bash로 소유 경로 밖 파일을 고치려 한다: ${p}\n명령: ${cmd}\n\n` + ownershipMsg(ws, p, owned) + guide);
      }
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

if (mode === 'review') {
  // Stop 훅은 매 응답 끝마다 돈다. exit 2로 막으면 첫 편집 직후 의미 없는 자기검사를
  // 강제하게 되므로 여기서는 경고(exit 1)만 하고, 실제 차단은 pre-push 훅이 맡는다
  if (ESCAPE || ev.stop_hook_active) ok();
  let changed = '';
  try {
    changed = execSync('git status --porcelain -- apps packages tests', { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch { ok(); }
  if (!changed.trim()) ok();

  let latest = 0;
  try {
    for (const f of readdirSync(`${cwd}/docs/reviews`)) {
      const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(f);
      if (m) latest = Math.max(latest, Date.parse(`${m[1]}-${m[2]}-${m[3]}`));
    }
  } catch { /* 폴더 없음 */ }

  const today = Date.parse(new Date().toISOString().slice(0, 10));
  if (latest < today) {
    console.error(
`[경고] 소스를 고쳤는데 오늘 SPEC 검사 기록이 없다.

변경된 파일:
${changed.trim().split('\n').slice(0, 8).map((l) => '  ' + l).join('\n')}

작업을 끝내기 전에 spec-review 스킬을 돌려라.
치명 항목이 0건이면 docs/reviews/<날짜>-<WS>.md 에 결과를 남긴다.
치명이 남아 있으면 고치고 다시 돌린다.

푸시하려면 반드시 필요하다. pre-push 훅이 막는다.`);
    process.exit(1);
  }
  ok();
}

if (mode === 'ownership') {
  if (ESCAPE) ok();
  const wsInfo = ownedPaths();
  if (!wsInfo || !wsInfo[1]) ok();
  const [ws, owned] = wsInfo;
  if (SHARED.some((p) => rel.startsWith(p))) ok();
  if (!owned.some((p) => rel.startsWith(p))) block(ownershipMsg(ws, rel, owned));
  ok();
}

ok();
