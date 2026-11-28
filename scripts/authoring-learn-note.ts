// 배운 줄 적기 — 게임을 배우는 AI 가 배울 때마다 지도 줄을 적는다. 서버와 같은 규칙으로 먼저 보고 자료 폴더 game-learned.json 에 합친다 (도메인/게임 §3.10 「게임 배우기」)
// 세션은 마감 · 컨텍스트에서 바로 끊긴다 — 적은 것만 남는다. 올리는 것은 세션이 끝난 뒤 에이전트가 한다
// 쓰는 법(값은 표준 입력의 JSON): npx tsx scripts/authoring-learn-note.ts <자료 폴더> — [{ kind, key, name, learned, reqIds? }, …] · 배운 것을 지우려면 learned: null. 0 적음 · 1 안 받음 · 2 부를 수 없음
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { type 배운것, 기획서종류 } from '../apps/admin/src/prd/gameKinds.js';
import { 요소검사 } from '../apps/admin/src/prd/gameMap.js';
import { 환경비밀번호들 } from './authoring-accounts.js';
import { 게임자리, 요소상한, 지도상한 } from './authoring-game.js';
import { 근거들, 얹기, 적은줄들, 정리알림, 지금지도, 지도읽기 } from './authoring-game-find.js';
import { type 판기록, 계획읽기, 나아감자리, 나아감열쇠, 대봄검사, 판기록들, 회고기록이름 } from './authoring-learn-check.js';
import { 결과읽기, 곳셈, 맵검사, 넘김판 } from './authoring-learn-play.js';
import { 놀이시작뒤 } from './authoring-learn-io.js';
import { 회고채우기 } from './authoring-learn-retro.js';
import { 시뮬불가검사, 시뮬불가재현 } from './authoring-learn-sim.js';
import { type 지도, 글자들, 빠진게임글 } from './authoring-learn-map.js';
import { 계정섞였나 } from './authoring-reverse.js';
import { 새로쓰기, 안전히읽기 } from './authoring-screens-keep-io.js';

/** 지도의 게임이 만든 종류 → 그 종류를 쓰는 열쇠 (서버 만든종류읽기와 같은 꼴) */
const 만든종류 = (지금: 지도): Map<string, string[]> =>
  new Map(지금.줄들.filter((x) => x.kind === 'KIND' && x.learned !== null).map((x) => [x.key.slice('kind:'.length), 지금.줄들.filter((y) => y.kind === x.key.slice('kind:'.length)).map((y) => y.key)]));

const 객체 = (v: unknown): Record<string, unknown> => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

/**
 * 판 기록으로 대 본다 — 「확인」은 판 기록 전부에서 값을 읽어 맞아야(지도 검증), 회고 줄은 칸이 맞아야 받고 기록에서 읽은 것을 채운다,
 * 계획 · 나아감 · 갈 곳 줄은 꼴을 본다. 틀리면 까닭 글. 회고 줄의 배운 것은 채운 것으로 바꾼다 (도메인/게임 §3.10 「지도 검증」 · 「회고」)
 */
/** 재현틀림 — 시뮬불가를 받기 전에 그 곳 판을 재현해 본다(자료 폴더에서 계산 입력을 읽어서 · 없으면 안 본다) */
type 재현틀림 = (열쇠: string, data: unknown, 줄들: readonly { kind: string; key: string; learned: 배운것 | null }[]) => string | null;
function 기록대보기(서버지도: 지도, 앞: readonly { key: string }[], 줄들: Record<string, unknown>[], 기록들: readonly 판기록[], 놀이기록: readonly 판기록[], 재현?: 재현틀림): string | null {
  const 지금 = 얹기(서버지도, 적은줄들(JSON.stringify({ elements: 앞 })));
  const 이번 = new Map(줄들.map((x) => [x.key as string, x]));
  const 찾기 = (k: string): { kind: string; key: string; learned: 배운것 } | undefined => {
    const n = 이번.get(k);
    if (n !== undefined) return n.learned === null ? undefined : { kind: n.kind as string, key: k, learned: n.learned as 배운것 };
    const o = 지금.줄들.find((x) => x.key === k);
    return o === undefined || o.learned === null ? undefined : { kind: o.kind, key: o.key, learned: o.learned };
  };
  // 이번에 적는 줄까지 얹은 지도 — 못깸 · 시뮬불가가 깸 · 판 수를 셀 때 쓴다
  const 합 = [...지금.줄들.filter((y) => !이번.has(y.key)), ...줄들.map((y) => ({ kind: y.kind as string, key: y.key as string, learned: y.learned as 배운것 | null }))];
  for (const x of 줄들) {
    const l = x.learned as 배운것 | null;
    if (l === null || typeof l !== 'object') continue;
    const 열쇠 = x.key as string;
    if (l.belief === 'CONFIRMED' && x.kind !== 'KIND') {
      const 걸림 = 대봄검사(l.data, 기록들);
      if (걸림.length > 0) return `${열쇠} — 확인으로 못 받는다: ${걸림.slice(0, 5).join(' / ')}${걸림.length > 5 ? ` 외 ${걸림.length - 5}` : ''}. 덜 봄(SEEN)으로 적거나 모자란 조건으로 더 해 본다`;
    }
    if (x.kind === 'TRIAL' && 객체(l.data).볼값 !== undefined) {
      const 계획 = 계획읽기(l.data);
      if (typeof 계획 === 'string') return `${열쇠} — ${계획}`;
    }
    if (열쇠 === 나아감열쇠 && 나아감자리(l.data) === null) return `${열쇠} — data 에 얼마나 나아갔나를 읽을 자리를 { 주소, 칸? } 로 적는다(깬 맵 수 · 레벨 · 해금 수)`;
    const 상태 = 객체(l.data).상태;
    if (x.kind === 'STAGE' && 상태 !== undefined && !(상태 === '가봄' || 상태 === '안감' || ((상태 === '못감' || 상태 === '못깸') && typeof 객체(l.data).까닭 === 'string'))) return `${열쇠} — data.상태 는 가봄 · 안감 · 못감 · 못깸이다(못감 · 못깸은 data.까닭)`;
    const 곳틀림 = x.kind === 'STAGE' ? (맵검사(l.data, 기록들) ?? (typeof 결과읽기(l.data) === 'string' ? (결과읽기(l.data) as string) : null) ?? 시뮬불가검사(열쇠, l.data, 찾기, 객체(l.data).시뮬불가 === undefined ? 0 : (곳셈(합, 기록들).find((y) => y.열쇠 === 열쇠)?.깸 ?? 0)) ?? (객체(l.data).시뮬불가 === undefined ? null : (재현?.(열쇠, l.data, 합) ?? null))) : null;
    if (곳틀림 !== null) return `${열쇠} — ${곳틀림}`;
    if (x.kind === 'STAGE' && 상태 === '못깸') {
      // 못 깨면 넘어가는 길로 쓰지 않게 — 그 곳을 넘김판만큼 해 봐야 못깸이다(2026-11-26 사용자 「깨게 만들어야지」 · 11-27 50판을 뺌)
      // 다시 시작한 때(놀이시작) 뒤 판만 센다 · 정보 모으기를 못깸으로 건너뛰지 못하게 그 곳의 정보 모으기(또는 못 하는 이유)도 있어야 한다
      const 셈 = 곳셈(합, 놀이기록).find((y) => y.열쇠 === 열쇠);
      if (셈 === undefined || 셈.깸 > 0 || 셈.판 < 넘김판) return `${열쇠} — 못깸은 data.결과 가 있는 곳을 ${넘김판}판 해 보고도 못 깼을 때만 적는다(지금 ${셈?.판 ?? 0}판 · 깸 ${셈?.깸 ?? 0})`;
      if (셈.정보 !== true) return `${열쇠} — 못깸은 그 곳에서 정보 모으기를 한 번 한 뒤에 적는다(\`npx tsx scripts/authoring-game-info.ts\` · 못 하면 data.정보못모음 에 이유)`;
    }
    if (x.kind === 'PLAY' && 회고기록이름(열쇠) !== null) {
      const 채운 = 회고채우기(열쇠, l, 찾기, 기록들);
      if (typeof 채운 === 'string') return `${열쇠} — 회고로 못 받는다: ${채운}`;
      x.learned = 채운;
    }
  }
  return null;
}

/** 앞에 적은 줄에 합친다 — 같은 열쇠는 새것이 이긴다. 틀리면 까닭 글(아무것도 안 적는다 — 한 줄이 틀리면 서버가 통째로 거절한다) */
export function 합치기(서버지도: 지도, 앞: readonly { key: string }[], 새: unknown, 기록들: readonly 판기록[] = [], 놀이기록: readonly 판기록[] = 기록들, 재현?: 재현틀림): { elements: { key: string }[]; 수: number } | string {
  const 줄들 = (Array.isArray(새) ? 새 : [새]) as Record<string, unknown>[];
  for (const x of 줄들) {
    if (typeof x !== 'object' || x === null || typeof x.key !== 'string') return '줄마다 kind · key · name · learned 를 적는다';
    if (!Object.hasOwn(x, 'learned')) return `${x.key} — learned 가 없다(지우려면 null)`;
    // value 는 기획서 값이다 — 본 값은 learned.data 에 적는다
    if (Object.hasOwn(x, 'value')) return `${x.key} — value 는 기획서 값이라 싣지 않는다. 잰 값은 learned.data 에 적는다`;
  }
  const 대본 = 기록대보기(서버지도, 앞, 줄들, 기록들, 놀이기록, 재현);
  if (대본 !== null) return 대본;
  const 합 = new Map(앞.map((e) => [e.key, e]));
  const 서버줄 = new Map(서버지도.줄들.map((x) => [x.key, x]));
  for (const x of 줄들) {
    const { kind, key, name, learned } = x;
    const 옛 = 서버줄.get(key as string);
    // 기획서에서 온 줄에 근거를 실으면 서버가 「기획서가 바뀜」을 비우고 값은 옛것 그대로다 — 다음 세션이 고칠 줄을 못 본다. 근거는 이미 있다
    const 근거 = 옛 !== undefined && 기획서종류.has(옛.kind) ? undefined : x.reqIds;
    // 서버는 근거를 통째로 바꾼다 — 앞에 확인한 요구가 빠지지 않게 합친다
    const reqIds = 근거 === undefined || 옛 === undefined || !Array.isArray(근거) ? 근거 : [...new Set([...근거들(옛), ...(근거 as unknown[])])];
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
  const 기록들 = 판기록들(자료);
  const r = 합치기(지도읽기(지도글), 적은줄들(안전히읽기(자료, 게임자리.배운글, 요소상한)), 새, 기록들, 놀이시작뒤(자료, 기록들), (열쇠, data, 줄들) => 시뮬불가재현(열쇠, data, 줄들, 자료, 기록들));
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
