#!/usr/bin/env node
// PR 을 진행 상황판으로 쓴다. 본문의 진행 상태 블록을 덮어쓰거나, 단계 코멘트를 단다.
//   node .claude/scripts/pr-update.mjs --pr 54 --tier 1 --step 5 --note "8/12" --next "게이트 2"
//   node .claude/scripts/pr-update.mjs --pr 54 --tier 1 --done       ← 병합 뒤. 전부 [x] 로 닫는다
//   node .claude/scripts/pr-update.mjs --pr 54 --comment "### [5/7] 구현 완료\n\n본문"
//
// 본문은 마커 사이만 갈아 끼운다. 마커 밖(무엇을 만드나 · 확인 방법)은 사람이 쓴 것이라 건드리지 않는다.
import { execFileSync } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// 쓸 때는 이름 없는 닻을 쓰고, 읽을 때는 옛 이름도 받는다.
// 2026-09-18 개명 때 마커에 체인 이름이 박혀 있어 열려 있던 PR 의 블록을 못 찾고
// 앞에 하나 더 붙였다. 닻은 기계만 읽으므로 이름을 따라갈 이유가 없다.
const BEGIN = '<!-- chain:status -->';
const END = '<!-- /chain:status -->';
const ANY_BEGIN = /<!-- ?\w+:status ?-->/;
const ANY_END = /<!-- ?\/\w+:status ?-->/;

const STEPS = [
  { n: 1, name: '시작 — 작업방 · 분류' },
  { n: 2, name: '명세 대조', minTier: 2 },
  { n: 3, name: '할 일 쪼개기', minTier: 2 },
  { n: 4, name: '계획 검토', minTier: 2 },
  { gate: 1, name: '🛑 게이트 1 — 승인', minTier: 2 },
  { n: 5, name: '구현' },
  { n: 6, name: '검사' },
  { gate: 2, name: '🛑 게이트 2 — 승인' },
  { n: 7, name: '병합' },
];

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

// 모르는 깃발은 조용히 무시되면 안 된다. 2026-09-19 에 없는 --comment-file 을 두 번 줬고,
// 두 번 다 코멘트가 안 달린 채 --step 도 같이 빠져 본문이 기본값(1/7 · 1등급)으로 덮였다.
const FLAGS = ['pr', 'tier', 'step', 'gate', 'note', 'next', 'ws', 'spec', 'comment', 'done'];
const unknown = process.argv.slice(2).filter((a) => a.startsWith('--') && !FLAGS.includes(a.slice(2)));
if (unknown.length > 0) {
  console.error(`모르는 깃발: ${unknown.join(' ')}\n쓸 수 있는 것: ${FLAGS.map((f) => `--${f}`).join(' ')}`);
  process.exit(2);
}

const pr = arg('pr');
if (!pr) { console.error('--pr <번호> 가 필요하다'); process.exit(2); }

const gh = (args) => execFileSync('gh', args, { encoding: 'utf8' });

// 임시 파일로 넘긴다. 본문에 백틱·따옴표가 섞여도 셸이 삼키지 않는다
function ghWithBody(args, body) {
  const f = join(tmpdir(), `tpx-${process.pid}-${Date.now()}.md`);
  writeFileSync(f, body);
  try { return execFileSync('gh', [...args, '--body-file', f], { encoding: 'utf8' }); }
  finally { unlinkSync(f); }
}

// --- 코멘트 달기 ---
const comment = arg('comment');
if (comment) {
  ghWithBody(['pr', 'comment', pr], comment.replace(/\\n/g, '\n'));
  console.log(`PR #${pr} 코멘트 추가`);
  process.exit(0);
}

// --- 본문 진행 상태 갱신 ---
const tier = Number(arg('tier', '1'));
const done = process.argv.includes('--done'); // 체인이 끝났다 — 전부 [x] 로 닫는다
const step = done ? 99 : Number(arg('step', '1'));
const gate = arg('gate');           // '1' | '2' — 그 게이트를 통과했다고 표시
const note = arg('note');           // 지금 단계 안의 진척. 예 "8/12"
const next = arg('next', done ? '없음 — 끝' : '게이트 2'); // 다음 멈춤
const ws = arg('ws');               // 갈래
const spec = arg('spec');           // 읽은 명세 분량

const passedGate = done ? 2 : (gate ? Number(gate) : (step >= 5 && tier >= 2 ? 1 : 0));

const lines = [];
for (const s of STEPS) {
  if (s.minTier && tier < s.minTier) {
    lines.push(`- ⤬ ${s.gate ? s.name.replace(' — 승인', '') : `${s.n}. ${s.name}`} — 건너뜀 (${tier}등급)`);
    continue;
  }
  if (s.gate) {
    lines.push(`- [${passedGate >= s.gate ? 'x' : ' '}] ${s.name}`);
    continue;
  }
  if (s.n < step) lines.push(`- [x] ${s.n}. ${s.name}`);
  else if (s.n === step) lines.push(`- [ ] **${s.n}. ${s.name}　← 지금 여기${note ? ` · ${note}` : ''}**`);
  else lines.push(`- [ ] ${s.n}. ${s.name}`);
}

const stamp = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).slice(5, 16);
const meta = [`**등급** ${tier}`, ws && `**갈래** ${ws}`, spec && `**읽은 명세** ${spec}`].filter(Boolean).join(' · ');

const block = [
  BEGIN,
  '## 진행 상태',
  '',
  ...lines,
  '',
  `🕐 마지막 갱신 **${stamp}** · 🛑 다음 멈춤 **${next}**`,
  meta,
  END,
].join('\n');

const body = JSON.parse(gh(['pr', 'view', pr, '--json', 'body'])).body ?? '';
// 옛 이름의 닻도 찾는다 — 못 찾으면 덮어쓰지 않고 앞에 하나 더 붙어 상황판이 둘이 된다
const mb = body.match(ANY_BEGIN);
const me = body.match(ANY_END);
const i = mb ? mb.index : -1;
const j = me ? me.index : -1;
// 마커가 없으면 맨 앞에 붙인다. 있으면 그 사이만 갈아 끼운다
const next_body = i > -1 && j > i
  ? body.slice(0, i) + block + body.slice(j + me[0].length)
  : `${block}\n\n${body}`;

ghWithBody(['pr', 'edit', pr], next_body);
console.log(`PR #${pr} 본문 갱신 — ${done ? '완료 7/7' : `${step}/7`} · 등급 ${tier} · 다음 ${next}`);
