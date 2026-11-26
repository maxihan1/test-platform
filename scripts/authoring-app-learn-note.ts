// 앱 배운 줄 적기 — 앱을 배우는 AI 가 배울 때마다 줄을 적는다. 서버와 같은 검사로 먼저 보고 자료 폴더 app-learned.json 에 합친다 (도메인/작성 §3.6 「★ 앱 배우기」 장치 ④)
// 세션은 마감 · 컨텍스트에서 바로 끊긴다 — 적은 것만 남는다. 올리는 것은 세션이 끝난 뒤 에이전트가 한다
// 쓰는 법(값은 표준 입력의 JSON): npx tsx scripts/authoring-app-learn-note.ts <자료 폴더> — [{ kind, key, name, screen, learned }, …] · 지우려면 learned: null. 0 적음 · 1 안 받음 · 2 부를 수 없음
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { 배운줄검사 } from '../apps/admin/src/prd/appLearned.js';
import { 환경비밀번호들 } from './authoring-accounts.js';
import { type 적은앱줄, 끝내도되나, 배운글읽기, 배움상한, 앱배움자리, 적은줄들, 정리알림 } from './authoring-app-learned.js';
import { 계정섞였나 } from './authoring-reverse.js';
import { 새로쓰기, 안전히읽기 } from './authoring-screens-keep-io.js';

/** 앞에 적은 줄에 합친다 — 같은 열쇠는 새것이 이긴다. 틀리면 까닭 글(한 줄이라도 틀리면 아무것도 안 적는다 — 서버가 통째로 거절한다) */
export function 합치기(받은열쇠: ReadonlySet<string>, 앞: readonly 적은앱줄[], 새: unknown): { rows: 적은앱줄[]; 수: number } | string {
  const 줄들 = (Array.isArray(새) ? 새 : [새]) as Record<string, unknown>[];
  for (const x of 줄들) {
    if (typeof x !== 'object' || x === null || typeof x.key !== 'string') return '줄마다 kind · key · name · screen · learned 를 적는다';
    if (!Object.hasOwn(x, 'learned')) return `${x.key} — learned 가 없다(지우려면 null)`;
  }
  const 합 = new Map(앞.map((e) => [e.key, e]));
  for (const x of 줄들) 합.set(x.key as string, { kind: x.kind, key: x.key, name: x.name, screen: x.screen ?? null, learned: x.learned } as 적은앱줄);
  // 이 세션에서 적었다가 지운 줄은 서버에 없다 — 실어도 할 일이 없다
  const rows = [...합.values()].filter((e) => e.learned !== null || 받은열쇠.has(e.key));
  const 본 = 배운줄검사({ rows });
  if ('error' in 본) {
    const 자리 = /^rows\.(\d+)/.exec(본.detail)?.[1];
    return `${자리 === undefined ? '' : `${rows[Number(자리)]?.key ?? ''} — `}${본.detail} 이 틀렸다(칸 꼴은 docs/spec/도메인/작성.md §7 「앱 배운 것 통로」)`;
  }
  return { rows, 수: 줄들.length };
}

export function 실행(인자: string[], 입력: string, env: NodeJS.ProcessEnv = process.env): number {
  const [자료] = 인자;
  if (자료 === undefined || 인자.length !== 1) {
    console.error('쓰는 법: npx tsx scripts/authoring-app-learn-note.ts <자료 폴더> — 줄은 표준 입력의 JSON');
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
  if (계정섞였나([입력, JSON.stringify(새)], 환경비밀번호들(env))) {
    console.error('[배운 줄] 안 받음 — 테스트 계정 비밀번호가 들어 있다');
    return 1;
  }
  const 받은열쇠 = new Set(배운글읽기(안전히읽기(자료, 앱배움자리.글, 64 * 1024 * 1024)).map((x) => x.key));
  const r = 합치기(받은열쇠, 적은줄들(안전히읽기(자료, 앱배움자리.적은, 배움상한)), 새);
  if (typeof r === 'string') {
    console.error(`[배운 줄] 안 받음 — 아무것도 안 적었다: ${r}`);
    return 1;
  }
  const 글 = JSON.stringify({ rows: r.rows });
  if (Buffer.byteLength(글) > 배움상한) {
    console.error('[배운 줄] 안 받음 — 한 세션에 적을 수 있는 크기(4MB)를 넘었다. 원본 기록은 자료 폴더에 두고 잰 값과 횟수만 적는다');
    return 1;
  }
  새로쓰기(join(자료, 앱배움자리.적은), 글);
  const { 남은화면, 열린 } = 끝내도되나(자료);
  console.log([`[배운 줄] ${String(r.수)}줄 적음 · 이번 세션에 적은 줄 ${String(r.rows.length)} · 배운 줄 없는 화면 ${String(남은화면.length)} · 열린 물음 ${String(열린.length)}`, ...정리알림(자료)].join('\n'));
  return 0;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = 실행(process.argv.slice(2), readFileSync(0, 'utf8'));
