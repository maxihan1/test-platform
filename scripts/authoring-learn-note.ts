// 배운 줄 적기 — 게임을 배우는 AI 가 배울 때마다 지도 줄을 적는다. 서버와 같은 규칙으로 먼저 보고 자료 폴더 game-learned.json 에 합친다 (도메인/게임 §3.10 「게임 배우기」)
// 세션은 마감 · 컨텍스트에서 바로 끊긴다 — 적은 것만 남는다. 올리는 것은 세션이 끝난 뒤 에이전트가 한다
// 쓰는 법(값은 표준 입력의 JSON): npx tsx scripts/authoring-learn-note.ts <자료 폴더> — [{ kind, key, name, learned, reqIds? }, …] · 배운 것을 지우려면 learned: null. 0 적음 · 1 안 받음 · 2 부를 수 없음
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { 요소검사 } from '../apps/admin/src/prd/gameMap.js';
import { 환경비밀번호들 } from './authoring-accounts.js';
import { 게임자리, 요소상한, 지도상한 } from './authoring-game.js';
import { 적은줄들, 정리알림, 지금지도, 지도읽기 } from './authoring-game-find.js';
import { type 지도, 글자들, 빠진게임글 } from './authoring-learn-map.js';
import { 계정섞였나 } from './authoring-reverse.js';
import { 새로쓰기, 안전히읽기 } from './authoring-screens-keep-io.js';

/** 지도의 게임이 만든 종류 → 그 종류를 쓰는 열쇠 (서버 만든종류읽기와 같은 꼴) */
const 만든종류 = (지금: 지도): Map<string, string[]> =>
  new Map(지금.줄들.filter((x) => x.kind === 'KIND' && x.learned !== null).map((x) => [x.key.slice('kind:'.length), 지금.줄들.filter((y) => y.kind === x.key.slice('kind:'.length)).map((y) => y.key)]));

/** 앞에 적은 줄에 합친다 — 같은 열쇠는 새것이 이긴다. 틀리면 까닭 글(아무것도 안 적는다 — 한 줄이 틀리면 서버가 통째로 거절한다) */
export function 합치기(서버지도: 지도, 앞: readonly { key: string }[], 새: unknown): { elements: { key: string }[]; 수: number } | string {
  const 줄들 = (Array.isArray(새) ? 새 : [새]) as Record<string, unknown>[];
  for (const x of 줄들) {
    if (typeof x !== 'object' || x === null || typeof x.key !== 'string') return '줄마다 kind · key · name · learned 를 적는다';
    if (!Object.hasOwn(x, 'learned')) return `${x.key} — learned 가 없다(지우려면 null)`;
    // value 는 기획서 값이다 — 본 값은 learned.data 에 적는다
    if (Object.hasOwn(x, 'value')) return `${x.key} — value 는 기획서 값이라 싣지 않는다. 잰 값은 learned.data 에 적는다`;
  }
  const 합 = new Map(앞.map((e) => [e.key, e]));
  for (const x of 줄들) {
    const { kind, key, name, learned, reqIds } = x;
    합.set(key as string, { kind, key, name, learned, ...(reqIds === undefined ? {} : { reqIds }) } as { key: string });
  }
  // 이 세션에서 적었다가 지운 줄은 서버에 없다 — 실으면 서버가 모르는 종류 · 열쇠로 볼 수 있다
  const 서버열쇠 = new Set(서버지도.줄들.map((x) => x.key));
  const elements = [...합.values()].filter((e) => (e as { learned?: unknown }).learned !== null || 서버열쇠.has(e.key));
  const 본 = 요소검사({ elements }, 만든종류(서버지도));
  if ('error' in 본) {
    const 자리 = /^elements\.(\d+)/.exec(본.detail)?.[1];
    return `${자리 === undefined ? '' : `${elements[Number(자리)]?.key ?? ''} — `}${본.detail} 이 틀렸다(칸 꼴은 docs/spec/도메인/게임.md §7 PUT game-elements)`;
  }
  return { elements, 수: 줄들.length };
}

export function 실행(인자: string[], 입력: string, env: NodeJS.ProcessEnv = process.env): number {
  const [자료] = 인자;
  const 지도글 = 자료 === undefined ? null : 안전히읽기(자료, 게임자리.지도, 지도상한);
  if (자료 === undefined || 지도글 === null) {
    console.error('쓰는 법: npx tsx scripts/authoring-learn-note.ts <자료 폴더> — 줄은 표준 입력의 JSON. 자료 폴더에 game-map.txt 가 있어야 한다');
    return 2;
  }
  let 새: unknown;
  try {
    새 = JSON.parse(입력);
  } catch {
    console.error('[배운 줄] 표준 입력을 JSON 으로 못 읽었다 — 아무것도 안 적었다');
    return 1;
  }
  // 올릴 때 섞여 있으면 그 세션 것이 통째로 안 올라간다
  if (계정섞였나(글자들(새), 환경비밀번호들(env))) {
    console.error('[배운 줄] 안 받음 — 테스트 계정 비밀번호가 들어 있다');
    return 1;
  }
  const r = 합치기(지도읽기(지도글), 적은줄들(안전히읽기(자료, 게임자리.배운글, 요소상한)), 새);
  if (typeof r === 'string') {
    console.error(`[배운 줄] 안 받음 — 아무것도 안 적었다: ${r}`);
    return 1;
  }
  const 글 = JSON.stringify({ elements: r.elements });
  if (Buffer.byteLength(글) > 요소상한) {
    console.error('[배운 줄] 안 받음 — 한 세션에 적을 수 있는 크기(4MB)를 넘었다. 원본 기록은 자료 폴더에 두고 잰 값과 횟수만 적는다');
    return 1;
  }
  새로쓰기(join(자료, 게임자리.배운글), 글);
  const 빠진 = 빠진게임글(안전히읽기(자료, 게임자리.게임글, 요소상한), 지금지도(자료)!);
  console.log([`[배운 줄] ${r.수}줄 적음 · 이번 세션에 적은 줄 ${r.elements.length}`, ...(빠진.length === 0 ? [] : [`게임 안 글 가운데 지도에 안 든 문장 ${빠진.length} — ${빠진[0]!.slice(0, 80)}`]), ...정리알림(자료)].join('\n'));
  return 0;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = 실행(process.argv.slice(2), readFileSync(0, 'utf8'));
